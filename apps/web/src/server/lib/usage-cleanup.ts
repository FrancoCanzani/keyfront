import { lt } from "drizzle-orm";
import type { Database } from "../db";
import { usageRollup } from "../db/schema/gateway";
import { withRedis } from "./redis";

const MINUTE_RETENTION_DAYS = 30;

// daily rows carry the history; runs at most once a day via the redis lock
export async function cleanupUsageRollup(db: Database) {
  const acquired = await withRedis((redis) =>
    redis.set("usage_cleanup_lock", "1", "EX", 86_400, "NX"),
  );
  if (acquired !== "OK") return;

  await db
    .delete(usageRollup)
    .where(
      lt(
        usageRollup.windowStart,
        new Date(Date.now() - MINUTE_RETENTION_DAYS * 86_400_000),
      ),
    );
}
