import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { services } from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import { withRedis } from "../../../lib/redis";
import type { AppRouteEnv } from "../../../types";
import { logsQuerySchema } from "./schemas";

// written by the gateway (internal/proxy/log.go) — keep in lockstep
type LogEntry = {
  ts: number;
  serviceId?: string;
  keyId?: string;
  keyPrefix: string;
  method: string;
  path: string;
  status: number;
  outcome?: string;
  region?: string;
  userAgent?: string;
  ms: number;
};

export const getLogs = new Hono<AppRouteEnv>().get(
  "/",
  zValidator("query", logsQuerySchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const { serviceId } = c.req.valid("query");

    const [service] = await c
      .get("db")
      .select({ id: services.id })
      .from(services)
      .where(
        and(
          eq(services.id, serviceId),
          eq(services.organizationId, organizationId),
        ),
      );
    if (!service) {
      throw new HTTPException(404, { message: "Service not found" });
    }

    const raw = await withRedis((redis) =>
      redis.lrange(`log:${serviceId}`, 0, 99),
    );
    const entries: LogEntry[] = raw.map((line) => JSON.parse(line));
    return c.json(entries);
  },
);
