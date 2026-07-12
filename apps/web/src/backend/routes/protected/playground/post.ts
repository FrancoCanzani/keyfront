import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { service } from "../../../db/schema/service";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { playgroundRequestSchema } from "./schemas";

const maxResponseBytes = 100_000;
const bodyMethods = new Set(["POST", "PUT", "PATCH"]);

export const postPlayground = new Hono<AppRouteEnv>().post(
  "/",
  zValidator("json", playgroundRequestSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const db = c.get("db");
    const input = c.req.valid("json");

    const [target] = await db
      .select({ host: service.host })
      .from(service)
      .where(
        and(
          eq(service.id, input.serviceId),
          eq(service.organizationId, organizationId),
        ),
      );
    if (!target) {
      throw new HTTPException(400, { message: "Unknown service" });
    }

    const gatewayUrl = process.env.GATEWAY_URL ?? "http://localhost:8080";
    const path = input.path.startsWith("/") ? input.path : `/${input.path}`;

    const headers = new Headers();
    for (const header of input.headers) {
      if (header.name.trim()) {
        headers.set(header.name.trim(), header.value);
      }
    }
    headers.set("X-Keyfront-Host", target.host);
    headers.set("Authorization", `Bearer ${input.apiKey}`);

    const started = performance.now();
    try {
      const res = await fetch(`${gatewayUrl}${path}`, {
        method: input.method,
        headers,
        body: bodyMethods.has(input.method) ? input.body : undefined,
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
      });
      const text = await res.text();

      return c.json({
        status: res.status,
        statusText: res.statusText,
        durationMs: Math.round(performance.now() - started),
        headers: [...res.headers.entries()].map(([name, value]) => ({
          name,
          value,
        })),
        body: text.slice(0, maxResponseBytes),
        truncated: text.length > maxResponseBytes,
      });
    } catch {
      throw new HTTPException(502, { message: "Gateway unreachable" });
    }
  },
);
