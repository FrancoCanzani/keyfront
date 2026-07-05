import { inArray, lt } from "drizzle-orm";
import type { Database } from "../db";
import { apiOperations, requestLogs } from "../db/schema/gateway";
import { createOperationMatcher } from "./openapi";
import { withRedis } from "./redis";

// written by the gateway to the logq list (internal/proxy/log.go) — keep in lockstep
type LogQueueEntry = {
  ts: number;
  serviceId: string;
  keyId?: string;
  method: string;
  path: string;
  status: number;
  outcome?: string;
  region?: string;
  userAgent?: string;
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
          keyId: entry.keyId ?? null,
          ts: new Date(entry.ts),
          method: entry.method,
          path: entry.path,
          status: entry.status,
          outcome: entry.outcome ?? null,
          region: entry.region ?? null,
          userAgent: entry.userAgent ?? null,
          ms: entry.ms,
        },
      ];
    } catch {
      return [];
    }
  });
  if (rows.length === 0) return;

  const annotated = await annotateOperations(db, rows).catch((error) => {
    console.error("[log-drain] operation matching:", error);
    return rows.map((row) => ({ ...row, operationId: null }));
  });

  await db.insert(requestLogs).values(annotated);
  await db
    .delete(requestLogs)
    .where(
      lt(requestLogs.ts, new Date(Date.now() - RETENTION_DAYS * 86_400_000)),
    );
}

type DrainRow = {
  serviceId: string;
  method: string;
  path: string;
  [key: string]: unknown;
};

async function annotateOperations<T extends DrainRow>(db: Database, rows: T[]) {
  const serviceIds = [...new Set(rows.map((row) => row.serviceId))];
  const operations = await db
    .select({
      id: apiOperations.id,
      serviceId: apiOperations.serviceId,
      method: apiOperations.method,
      segments: apiOperations.segments,
    })
    .from(apiOperations)
    .where(inArray(apiOperations.serviceId, serviceIds));

  const matchers = new Map<string, ReturnType<typeof createOperationMatcher>>();
  for (const serviceId of serviceIds) {
    matchers.set(
      serviceId,
      createOperationMatcher(
        operations.filter((op) => op.serviceId === serviceId),
      ),
    );
  }

  return rows.map((row) => ({
    ...row,
    operationId: matchers.get(row.serviceId)?.(row.method, row.path) ?? null,
  }));
}
