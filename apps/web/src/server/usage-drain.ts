import { inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { apiKeys, usageRollup } from "./db/schema/gateway";
import { redis } from "./redis";

// usage:{keyId}:{windowStartMs} → usage_rollup; GETDEL makes concurrent drains safe

export async function drainUsage() {
  const counters: { keyId: string; windowStart: Date; count: number }[] = [];

  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", "usage:*", "COUNT", 500);
    cursor = next;
    for (const redisKey of keys) {
      const raw = await redis.getdel(redisKey);
      if (!raw) continue;
      const [, keyId, windowMs] = redisKey.split(":");
      if (!keyId || !windowMs) continue;
      counters.push({
        keyId,
        windowStart: new Date(Number(windowMs)),
        count: Number(raw),
      });
    }
  } while (cursor !== "0");

  if (counters.length === 0) return;

  for (const row of counters) {
    await db
      .insert(usageRollup)
      .values(row)
      .onConflictDoUpdate({
        target: [usageRollup.keyId, usageRollup.windowStart],
        set: { count: sql`${usageRollup.count} + ${row.count}` },
      });
  }

  const keyIds = [...new Set(counters.map((c) => c.keyId))];
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(inArray(apiKeys.id, keyIds));
}

export function startUsageDrain(intervalMs = 30_000) {
  setInterval(() => {
    drainUsage().catch((error) => console.error("[usage-drain]", error));
  }, intervalMs);
}
