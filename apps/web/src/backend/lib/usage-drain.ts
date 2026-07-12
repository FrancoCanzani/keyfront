import { eq } from "drizzle-orm";
import { createDatabase } from "../db";
import { key } from "../db/schema/key";
import { usageRollup } from "../db/schema/usage";
import { withRedis } from "./redis";

const monthPeriod = /^\d{4}-\d{2}$/;

type Counter = { keyId: string; period: string; requests: number };

export async function drainUsage() {
  const counters = await withRedis(async (redis) => {
    const found: Counter[] = [];
    let cursor = "0";
    do {
      const [next, names] = await redis.scan(
        cursor,
        "MATCH",
        "usage:*",
        "COUNT",
        100,
      );
      cursor = next;
      for (const name of names) {
        const [, keyId, period] = name.split(":");
        if (!keyId || !period || !monthPeriod.test(period)) {
          continue;
        }
        const value = await redis.get(name);
        const requests = Number(value);
        if (Number.isFinite(requests) && requests > 0) {
          found.push({ keyId, period, requests });
        }
      }
    } while (cursor !== "0");
    return found;
  });

  if (counters.length === 0) {
    return 0;
  }

  const { db, close } = createDatabase();
  try {
    for (const counter of counters) {
      const [owner] = await db
        .select({
          organizationId: key.organizationId,
          serviceId: key.serviceId,
        })
        .from(key)
        .where(eq(key.id, counter.keyId));
      if (!owner) {
        continue;
      }

      // Counters store attempts; billing must cap at the plan quota.
      await db
        .insert(usageRollup)
        .values({
          organizationId: owner.organizationId,
          serviceId: owner.serviceId,
          keyId: counter.keyId,
          periodStart: new Date(`${counter.period}-01T00:00:00Z`),
          requests: counter.requests,
        })
        .onConflictDoUpdate({
          target: [usageRollup.keyId, usageRollup.periodStart],
          set: { requests: counter.requests },
        });
    }
  } finally {
    await close();
  }

  return counters.length;
}
