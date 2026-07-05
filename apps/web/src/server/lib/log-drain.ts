import { lt } from "drizzle-orm";
import type { Database } from "../db";
import { requestLogs } from "../db/schema/gateway";
import { withRedis } from "./redis";

// written by the gateway to the logq list (internal/proxy/log.go) — keep in lockstep
type LogQueueEntry = {
  ts: number;
  serviceId: string;
  keyId: string | null;
  method: string;
  path: string;
  status: number;
  outcome?: string;
  ms: number;
};

const RETENTION_DAYS = 30;

export async function drainRequestLogs(db: Database) {
  const raw = await withRedis(async (redis) => {
    const batch: string[] = [];
    for (;;) {
      const chunk = await redis.lpop("logq", 500);
      if (!chunk || chunk.length === 0) break;
      batch.push(...chunk);
      if (batch.length >= 5_000) break;
    }
    return batch;
  });
  if (raw.length === 0) return;

  const rows = raw.flatMap((line) => {
    try {
      const entry = JSON.parse(line) as LogQueueEntry;
      return [
        {
          serviceId: entry.serviceId,
          keyId: entry.keyId,
          ts: new Date(entry.ts),
          method: entry.method,
          path: entry.path,
          status: entry.status,
          outcome: entry.outcome ?? null,
          ms: entry.ms,
        },
      ];
    } catch {
      return [];
    }
  });
  if (rows.length === 0) return;

  await db.insert(requestLogs).values(rows);
  await db
    .delete(requestLogs)
    .where(
      lt(requestLogs.ts, new Date(Date.now() - RETENTION_DAYS * 86_400_000)),
    );
}
