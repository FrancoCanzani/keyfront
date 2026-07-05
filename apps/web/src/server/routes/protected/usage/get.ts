import { zValidator } from "@hono/zod-validator";
import { and, eq, gte, sql } from "drizzle-orm";
import { Hono } from "hono";
import {
  apiKeys,
  consumers,
  plans,
  services,
  usageRollup,
  usageRollupDaily,
} from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import { drainUsage } from "../../../lib/usage-drain";
import type { AppRouteEnv } from "../../../types";
import { usageQuerySchema } from "./schemas";

const rangeHours = { "24h": 24, "7d": 7 * 24, "30d": 30 * 24 };

// the cron drain never fires in vite dev; redis being down must not block the charts
let lastDrainAt = 0;

async function drainOnRead(db: Parameters<typeof drainUsage>[0]) {
  if (Date.now() - lastDrainAt < 15_000) return;
  lastDrainAt = Date.now();
  try {
    await drainUsage(db);
  } catch (error) {
    console.error("[usage] drain on read:", error);
  }
}

export const getUsage = new Hono<AppRouteEnv>().get(
  "/",
  zValidator("query", usageQuerySchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const { serviceId, range } = c.req.valid("query");
    const db = c.get("db");

    await drainOnRead(db);

    const since = new Date(Date.now() - rangeHours[range] * 3_600_000);
    if (range !== "24h") since.setUTCHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const sinceParam = sql.param(since, usageRollup.windowStart);
    const monthStartParam = sql.param(monthStart, usageRollup.windowStart);

    const scoped = and(
      eq(consumers.serviceId, serviceId),
      eq(services.organizationId, organizationId),
    );

    const hourBucket = sql<string>`date_trunc('hour', ${usageRollup.windowStart})`;
    const dayBucket = sql<string>`${usageRollupDaily.day}`;

    const series =
      range === "24h"
        ? await db
            .select({
              bucket: hourBucket,
              count: sql`sum(${usageRollup.count})`.mapWith(Number),
              ok: sql`sum(${usageRollup.okCount})`.mapWith(Number),
              err4: sql`sum(${usageRollup.err4Count})`.mapWith(Number),
              err5: sql`sum(${usageRollup.err5Count})`.mapWith(Number),
              latencyMsSum: sql`sum(${usageRollup.latencyMsSum})`.mapWith(Number),
            })
            .from(usageRollup)
            .innerJoin(apiKeys, eq(usageRollup.keyId, apiKeys.id))
            .innerJoin(consumers, eq(apiKeys.consumerId, consumers.id))
            .innerJoin(services, eq(consumers.serviceId, services.id))
            .where(and(scoped, gte(usageRollup.windowStart, since)))
            .groupBy(hourBucket)
            .orderBy(hourBucket)
        : await db
            .select({
              bucket: dayBucket,
              count: sql`sum(${usageRollupDaily.count})`.mapWith(Number),
              ok: sql`sum(${usageRollupDaily.okCount})`.mapWith(Number),
              err4: sql`sum(${usageRollupDaily.err4Count})`.mapWith(Number),
              err5: sql`sum(${usageRollupDaily.err5Count})`.mapWith(Number),
              latencyMsSum: sql`sum(${usageRollupDaily.latencyMsSum})`.mapWith(Number),
            })
            .from(usageRollupDaily)
            .innerJoin(apiKeys, eq(usageRollupDaily.keyId, apiKeys.id))
            .innerJoin(consumers, eq(apiKeys.consumerId, consumers.id))
            .innerJoin(services, eq(consumers.serviceId, services.id))
            .where(and(scoped, gte(usageRollupDaily.day, since)))
            .groupBy(usageRollupDaily.day)
            .orderBy(usageRollupDaily.day);

    const keys = await db
      .select({
        keyId: apiKeys.id,
        prefix: apiKeys.prefix,
        status: apiKeys.status,
        consumerExternalRef: consumers.externalRef,
        planName: plans.name,
        monthlyQuota: plans.monthlyQuota,
        lastUsedAt: apiKeys.lastUsedAt,
        count: sql`coalesce(sum(${usageRollup.count}) filter (where ${usageRollup.windowStart} >= ${sinceParam}), 0)`.mapWith(Number),
        err4: sql`coalesce(sum(${usageRollup.err4Count}) filter (where ${usageRollup.windowStart} >= ${sinceParam}), 0)`.mapWith(Number),
        err5: sql`coalesce(sum(${usageRollup.err5Count}) filter (where ${usageRollup.windowStart} >= ${sinceParam}), 0)`.mapWith(Number),
        latencyMsSum: sql`coalesce(sum(${usageRollup.latencyMsSum}) filter (where ${usageRollup.windowStart} >= ${sinceParam}), 0)`.mapWith(Number),
        monthCount: sql`coalesce(sum(${usageRollup.count}) filter (where ${usageRollup.windowStart} >= ${monthStartParam}), 0)`.mapWith(Number),
      })
      .from(apiKeys)
      .innerJoin(consumers, eq(apiKeys.consumerId, consumers.id))
      .innerJoin(services, eq(consumers.serviceId, services.id))
      .innerJoin(plans, eq(apiKeys.planId, plans.id))
      .leftJoin(usageRollup, eq(usageRollup.keyId, apiKeys.id))
      .where(scoped)
      .groupBy(
        apiKeys.id,
        apiKeys.prefix,
        apiKeys.status,
        consumers.externalRef,
        plans.name,
        plans.monthlyQuota,
        apiKeys.lastUsedAt,
      );

    keys.sort((a, b) => b.count - a.count);
    return c.json({ series, keys });
  },
);
