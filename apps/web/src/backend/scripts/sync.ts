import { createDatabase } from "../db";
import { key } from "../db/schema/key";
import { plan } from "../db/schema/plan";
import { service } from "../db/schema/service";
import { withRedis } from "../lib/redis";
import { syncKey, syncPlan, syncRoute } from "../lib/sync";

const { db, close } = createDatabase();

const services = await db.select().from(service);
const plans = await db.select().from(plan);
const keys = await db.select().from(key);

await withRedis(async (redis) => {
  for (const row of services) {
    await syncRoute(redis, {
      serviceId: row.id,
      host: row.host,
      upstream: row.upstream,
      secret: row.gatewaySecret,
    });
  }

  for (const row of plans) {
    await syncPlan(redis, row.id, {
      rateLimit: row.rateLimit,
      burst: row.burst,
      monthlyQuota: row.monthlyQuota,
    });
  }

  for (const row of keys) {
    await syncKey(redis, row.keyHash, {
      id: row.id,
      organizationId: row.organizationId,
      identityId: row.identityId,
      serviceId: row.serviceId,
      planId: row.planId,
      environment: row.keyPrefix.startsWith("kf_test_") ? "test" : "live",
      status: row.revokedAt ? "revoked" : "active",
    });
  }
});

await close();

console.log(
  `synced ${services.length} routes, ${plans.length} plans, ${keys.length} keys`,
);
