import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { services } from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";

const testRequestSchema = z.object({
  serviceId: z.string().min(1),
  apiKey: z.string().min(1),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().startsWith("/").max(2048),
  headers: z.record(z.string().max(200), z.string().max(2_000)).default({}),
  body: z.string().max(10_000).nullable().default(null),
});

const blockedHeaders = new Set([
  "authorization",
  "connection",
  "content-length",
  "host",
]);

const gatewayDomain = () => process.env.GATEWAY_DOMAIN ?? "localhost:8080";

export const testRequest = new Hono<AppRouteEnv>().post(
  "/",
  zValidator("json", testRequestSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const input = c.req.valid("json");

    const [service] = await c
      .get("db")
      .select({ hostKey: services.hostKey })
      .from(services)
      .where(
        and(
          eq(services.id, input.serviceId),
          eq(services.organizationId, organizationId),
        ),
      );
    if (!service) {
      throw new HTTPException(404, { message: "Service not found" });
    }

    const domain = gatewayDomain();
    const scheme = domain.includes("localhost") ? "http" : "https";
    const url = `${scheme}://${service.hostKey}.${domain}${input.path}`;

    const started = Date.now();
    const headers = new Headers();
    for (const [name, value] of Object.entries(input.headers)) {
      if (!blockedHeaders.has(name.toLowerCase())) {
        headers.set(name, value);
      }
    }
    headers.set("Authorization", `Bearer ${input.apiKey}`);
    if (input.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    let res: Response;
    try {
      res = await fetch(url, {
        method: input.method,
        headers,
        body: input.method === "GET" ? undefined : (input.body ?? undefined),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      return c.json({
        ok: false as const,
        error: error instanceof Error ? error.message : "Request failed",
      });
    }
    const ms = Date.now() - started;

    const pick = (name: string) => res.headers.get(name);
    const body = (await res.text()).slice(0, 10_000);
    return c.json({
      ok: true as const,
      status: res.status,
      ms,
      rateLimit: pick("x-ratelimit-limit"),
      rateRemaining: pick("x-ratelimit-remaining"),
      quotaLimit: pick("x-quota-limit"),
      quotaRemaining: pick("x-quota-remaining"),
      body,
    });
  },
);
