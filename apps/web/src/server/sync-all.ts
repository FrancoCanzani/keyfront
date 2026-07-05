import { and, eq } from "drizzle-orm";
import { createDatabase } from "./db";
import { apiKeys, consumers, plans, services } from "./db/schema/gateway";
import { createRedis } from "./lib/redis";

// rebuilds redis from PG: bun run sync

const redis = createRedis();
const { db, close } = createDatabase();

async function clearPrefix(prefix: string) {
  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 500);
    cursor = next;
    if (keys.length > 0) await redis.del(...keys);
  } while (cursor !== "0");
}

const serviceRows = await db.select().from(services);
const planRows = await db.select().from(plans);
const keyRows = await db
  .select({
    keyHash: apiKeys.keyHash,
    keyId: apiKeys.id,
    planId: apiKeys.planId,
    prefix: apiKeys.prefix,
    expiresAt: apiKeys.expiresAt,
    environment: apiKeys.environment,
    rps: apiKeys.rps,
    burst: apiKeys.burst,
    ipAllowlist: apiKeys.ipAllowlist,
    serviceId: consumers.serviceId,
  })
  .from(apiKeys)
  .innerJoin(consumers, eq(apiKeys.consumerId, consumers.id))
  .where(and(eq(apiKeys.status, "active"), eq(apiKeys.enabled, true)));

await clearPrefix("route:");
await clearPrefix("plan:");
await clearPrefix("key:");

const pipeline = redis.pipeline();
for (const s of serviceRows) {
  pipeline.set(
    `route:${s.hostKey}`,
    JSON.stringify({
      serviceId: s.id,
      organizationId: s.organizationId,
      originUrl: s.originUrl,
    }),
  );
}
for (const p of planRows) {
  pipeline.set(
    `plan:${p.id}`,
    JSON.stringify({ rps: p.rps, burst: p.burst, monthlyQuota: p.monthlyQuota }),
  );
}
for (const k of keyRows) {
  pipeline.set(
    `key:${k.keyHash}`,
    JSON.stringify({
      keyId: k.keyId,
      serviceId: k.serviceId,
      planId: k.planId,
      prefix: k.prefix,
      expiresAt: k.expiresAt ? k.expiresAt.getTime() : null,
      environment: k.environment,
      rps: k.rps,
      burst: k.burst,
      ipAllowlist: k.ipAllowlist,
    }),
  );
}
await pipeline.exec();

console.log(
  `synced ${serviceRows.length} routes, ${planRows.length} plans, ${keyRows.length} keys`,
);
await redis.quit();
await close();
process.exit(0);
