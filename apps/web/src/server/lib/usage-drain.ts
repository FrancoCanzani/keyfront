import { inArray, sql } from "drizzle-orm";
import type { Database } from "../db";
import { apiKeys, usageRollup } from "../db/schema/gateway";
import { withRedis } from "./redis";

// usage:{keyId}:{windowStartMs} hashes → usage_rollup; MULTI makes read+clear atomic

export async function drainUsage(db: Database) {
  const rows = await withRedis(async (redis) => {
    const drained: (typeof usageRollup.$inferInsert)[] = [];

    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", "usage:*", "COUNT", 500);
      cursor = next;
      for (const redisKey of keys) {
        const [, keyId, windowMs] = redisKey.split(":");
        if (!keyId || !windowMs) continue;
        const results = await redis.multi().hgetall(redisKey).del(redisKey).exec();
        const fields = (results?.[0]?.[1] ?? {}) as Record<string, string>;
        if (!fields.count) continue;
        drained.push({
          keyId,
          windowStart: new Date(Number(windowMs)),
          count: Number(fields.count),
          okCount: Number(fields.ok ?? 0),
          err4Count: Number(fields.err4 ?? 0),
          err5Count: Number(fields.err5 ?? 0),
          latencyMsSum: Number(fields.lat_sum ?? 0),
        });
      }
    } while (cursor !== "0");

    return drained;
  });

  if (rows.length === 0) return;

  for (const row of rows) {
    await db
      .insert(usageRollup)
      .values(row)
      .onConflictDoUpdate({
        target: [usageRollup.keyId, usageRollup.windowStart],
        set: {
          count: sql`${usageRollup.count} + ${row.count}`,
          okCount: sql`${usageRollup.okCount} + ${row.okCount}`,
          err4Count: sql`${usageRollup.err4Count} + ${row.err4Count}`,
          err5Count: sql`${usageRollup.err5Count} + ${row.err5Count}`,
          latencyMsSum: sql`${usageRollup.latencyMsSum} + ${row.latencyMsSum}`,
        },
      });
  }

  const keyIds = [...new Set(rows.map((r) => r.keyId))];
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(inArray(apiKeys.id, keyIds));
}
