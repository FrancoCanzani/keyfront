import { zValidator } from "@hono/zod-validator";
import { and, asc, count, desc, eq, gte, ilike, lt } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Database } from "../../../db";
import { apiKeys, requestLogs, services } from "../../../db/schema/gateway";
import { drainRequestLogs } from "../../../lib/log-drain";
import { getOrganizationId } from "../../../middleware/auth";
import { withRedis } from "../../../lib/redis";
import type { AppRouteEnv } from "../../../types";
import { logsQuerySchema, type LogsQuery } from "./schemas";

export type LogEntry = {
  ts: number;
  keyPrefix: string;
  method: string;
  path: string;
  status: number;
  outcome?: string;
  region?: string;
  userAgent?: string;
  ms: number;
  live?: boolean;
};

type VolumeSlot = {
  ts: number;
  label: string;
  ok: number;
  err4: number;
  err5: number;
};

type RedisLogEntry = {
  ts: number;
  keyPrefix?: string;
  method: string;
  path: string;
  status: number;
  outcome?: string;
  region?: string;
  userAgent?: string;
  ms: number;
};

let lastDrainAt = 0;

async function drainOnRead(db: Database) {
  if (Date.now() - lastDrainAt < 15_000) return;
  lastDrainAt = Date.now();
  try {
    await drainRequestLogs(db);
  } catch (error) {
    console.error("[logs] drain on read:", error);
  }
}

function entryId(entry: LogEntry) {
  return `${entry.ts}-${entry.method}-${entry.path}-${entry.status}-${entry.ms}`;
}

function statusFilter(query: LogsQuery) {
  switch (query.status) {
    case "2xx":
      return lt(requestLogs.status, 400);
    case "4xx":
      return and(gte(requestLogs.status, 400), lt(requestLogs.status, 500));
    case "5xx":
      return gte(requestLogs.status, 500);
    default:
      return undefined;
  }
}

function whereClause(query: LogsQuery) {
  return and(
    eq(requestLogs.serviceId, query.serviceId),
    statusFilter(query),
    query.method === "all" ? undefined : eq(requestLogs.method, query.method),
    query.key === "" ? undefined : ilike(apiKeys.prefix, `${query.key}%`),
  );
}

function sortColumn(query: LogsQuery) {
  switch (query.sort) {
    case "status":
      return requestLogs.status;
    case "ms":
      return requestLogs.ms;
    case "method":
      return requestLogs.method;
    case "path":
      return requestLogs.path;
    case "ts":
      return requestLogs.ts;
  }
}

function matchesStatus(status: number, filter: LogsQuery["status"]) {
  switch (filter) {
    case "all":
      return true;
    case "2xx":
      return status < 400;
    case "4xx":
      return status >= 400 && status < 500;
    case "5xx":
      return status >= 500;
  }
}

function matchesQuery(entry: LogEntry, query: LogsQuery) {
  return (
    matchesStatus(entry.status, query.status) &&
    (query.method === "all" || entry.method === query.method) &&
    (query.key === "" || entry.keyPrefix.startsWith(query.key))
  );
}

function compareEntries(a: LogEntry, b: LogEntry, query: LogsQuery) {
  let cmp = 0;
  switch (query.sort) {
    case "status":
      cmp = a.status - b.status;
      break;
    case "ms":
      cmp = a.ms - b.ms;
      break;
    case "method":
      cmp = a.method.localeCompare(b.method);
      break;
    case "path":
      cmp = a.path.localeCompare(b.path);
      break;
    case "ts":
      cmp = a.ts - b.ts;
      break;
  }
  return query.order === "asc" ? cmp : -cmp;
}

function dedupeEntries(entries: LogEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const id = entryId(entry);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function buildVolumeSeries(entries: LogEntry[]): VolumeSlot[] {
  if (entries.length < 2) return [];
  const min = entries[entries.length - 1].ts;
  const max = entries[0].ts;
  const span = Math.max(max - min, 60_000);
  const slotCount = 40;
  const slotSize = span / slotCount;

  const slots = Array.from({ length: slotCount }, (_, i) => ({
    ts: min + i * slotSize,
    ok: 0,
    err4: 0,
    err5: 0,
  }));
  for (const entry of entries) {
    const index = Math.min(
      Math.floor((entry.ts - min) / slotSize),
      slotCount - 1,
    );
    if (entry.status >= 500) slots[index].err5 += 1;
    else if (entry.status >= 400) slots[index].err4 += 1;
    else slots[index].ok += 1;
  }
  return slots.map((slot) => ({
    ...slot,
    label: new Date(slot.ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));
}

function mapRow(row: {
  ts: Date;
  method: string;
  path: string;
  status: number;
  outcome: string | null;
  region: string | null;
  userAgent: string | null;
  ms: number;
  keyPrefix: string | null;
}): LogEntry {
  return {
    ts: row.ts.getTime(),
    keyPrefix: row.keyPrefix ?? "-",
    method: row.method,
    path: row.path,
    status: row.status,
    outcome: row.outcome ?? undefined,
    region: row.region ?? undefined,
    userAgent: row.userAgent ?? undefined,
    ms: row.ms,
  };
}

function mapRedisEntry(entry: RedisLogEntry, live = true): LogEntry {
  return {
    ts: entry.ts,
    keyPrefix: entry.keyPrefix ?? "-",
    method: entry.method,
    path: entry.path,
    status: entry.status,
    outcome: entry.outcome,
    region: entry.region,
    userAgent: entry.userAgent,
    ms: entry.ms,
    live,
  };
}

async function fetchRedisLogs(serviceId: string): Promise<LogEntry[]> {
  const raw = await withRedis((redis) =>
    redis.lrange(`log:${serviceId}`, 0, 99),
  );
  return raw.flatMap((line) => {
    try {
      return [mapRedisEntry(JSON.parse(line) as RedisLogEntry)];
    } catch {
      return [];
    }
  });
}

async function fetchRecentPostgresIds(db: Database, serviceId: string) {
  const rows = await db
    .select({
      ts: requestLogs.ts,
      method: requestLogs.method,
      path: requestLogs.path,
      status: requestLogs.status,
      ms: requestLogs.ms,
    })
    .from(requestLogs)
    .where(eq(requestLogs.serviceId, serviceId))
    .orderBy(desc(requestLogs.ts))
    .limit(150);

  return new Set(rows.map((row) => entryId(mapRow({ ...row, outcome: null, region: null, userAgent: null, keyPrefix: null }))));
}

function queryRedisLogs(entries: LogEntry[], query: LogsQuery) {
  const filtered = entries.filter((entry) => matchesQuery(entry, query));
  const sorted = [...filtered].sort((a, b) => compareEntries(a, b, query));
  const total = sorted.length;
  const offset = (query.page - 1) * query.limit;
  const pageEntries = sorted.slice(offset, offset + query.limit);
  const methods = [...new Set(entries.map((entry) => entry.method))].sort();
  const volumeSource = [...filtered].sort((a, b) =>
    compareEntries(a, b, { ...query, sort: "ts", order: "desc" }),
  );
  const volume = buildVolumeSeries(volumeSource.slice(0, 200));

  return {
    entries: pageEntries,
    total,
    methods,
    volume,
  };
}

async function mergeLiveRedis(
  db: Database,
  query: LogsQuery,
  postgresEntries: LogEntry[],
  postgresTotal: number,
  volumeRows: LogEntry[],
  postgresMethods: string[],
) {
  if (query.page !== 1 || query.sort !== "ts" || query.order !== "desc") {
    return {
      entries: postgresEntries,
      total: postgresTotal,
      methods: postgresMethods,
      volume: buildVolumeSeries(volumeRows),
    };
  }

  const [redisAll, recentIds] = await Promise.all([
    fetchRedisLogs(query.serviceId),
    fetchRecentPostgresIds(db, query.serviceId),
  ]);

  const liveEntries = redisAll
    .filter((entry) => matchesQuery(entry, query))
    .filter((entry) => !recentIds.has(entryId(entry)))
    .map((entry) => ({ ...entry, live: true }));

  if (liveEntries.length === 0) {
    return {
      entries: postgresEntries,
      total: postgresTotal,
      methods: postgresMethods,
      volume: buildVolumeSeries(volumeRows),
    };
  }

  const merged = dedupeEntries([...liveEntries, ...postgresEntries]).sort(
    (a, b) => compareEntries(a, b, query),
  );
  const methods = [
    ...new Set([
      ...postgresMethods,
      ...redisAll.map((entry) => entry.method),
    ]),
  ].sort();
  const volume = buildVolumeSeries(
    dedupeEntries([...liveEntries, ...volumeRows])
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 200),
  );

  return {
    entries: merged.slice(0, query.limit),
    total: postgresTotal + liveEntries.length,
    methods,
    volume,
  };
}

export const getLogs = new Hono<AppRouteEnv>().get(
  "/",
  zValidator("query", logsQuerySchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const query = c.req.valid("query");
    const db = c.get("db");

    const [service] = await db
      .select({ id: services.id })
      .from(services)
      .where(
        and(
          eq(services.id, query.serviceId),
          eq(services.organizationId, organizationId),
        ),
      );
    if (!service) {
      throw new HTTPException(404, { message: "Service not found" });
    }

    await drainOnRead(db);

    const where = whereClause(query);
    const orderFn = query.order === "asc" ? asc : desc;
    const offset = (query.page - 1) * query.limit;

    const [totalRow, rows, methodRows, volumeRows] = await Promise.all([
      db
        .select({ total: count() })
        .from(requestLogs)
        .leftJoin(apiKeys, eq(requestLogs.keyId, apiKeys.id))
        .where(where),
      db
        .select({
          ts: requestLogs.ts,
          method: requestLogs.method,
          path: requestLogs.path,
          status: requestLogs.status,
          outcome: requestLogs.outcome,
          region: requestLogs.region,
          userAgent: requestLogs.userAgent,
          ms: requestLogs.ms,
          keyPrefix: apiKeys.prefix,
        })
        .from(requestLogs)
        .leftJoin(apiKeys, eq(requestLogs.keyId, apiKeys.id))
        .where(where)
        .orderBy(orderFn(sortColumn(query)))
        .limit(query.limit)
        .offset(offset),
      db
        .selectDistinct({ method: requestLogs.method })
        .from(requestLogs)
        .where(eq(requestLogs.serviceId, query.serviceId))
        .orderBy(asc(requestLogs.method)),
      db
        .select({
          ts: requestLogs.ts,
          method: requestLogs.method,
          path: requestLogs.path,
          status: requestLogs.status,
          outcome: requestLogs.outcome,
          region: requestLogs.region,
          userAgent: requestLogs.userAgent,
          ms: requestLogs.ms,
          keyPrefix: apiKeys.prefix,
        })
        .from(requestLogs)
        .leftJoin(apiKeys, eq(requestLogs.keyId, apiKeys.id))
        .where(where)
        .orderBy(desc(requestLogs.ts))
        .limit(200),
    ]);

    const total = totalRow[0]?.total ?? 0;
    const postgresMethods = methodRows.map((row) => row.method);

    if (total === 0) {
      const redisEntries = await fetchRedisLogs(query.serviceId);
      const redisResult = queryRedisLogs(redisEntries, query);
      return c.json({
        ...redisResult,
        page: query.page,
        limit: query.limit,
      });
    }

    const postgresEntries = rows.map(mapRow);
    const merged = await mergeLiveRedis(
      db,
      query,
      postgresEntries,
      total,
      volumeRows.map(mapRow),
      postgresMethods,
    );

    return c.json({
      ...merged,
      page: query.page,
      limit: query.limit,
    });
  },
);
