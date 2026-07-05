import { zValidator } from "@hono/zod-validator";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { apiSpecs, services } from "../../../db/schema/gateway";
import { gatewayUrlFor } from "../../../lib/gateway-url";
import { verifyReferenceToken } from "../../../lib/reference-token";
import type { AppRouteEnv } from "../../../types";

const referenceQuerySchema = z.object({ token: z.string().min(1) });

// token-gated, not session-gated: consumed server-side by the docs app
export const getReference = new Hono<AppRouteEnv>().get(
  "/:hostKey",
  zValidator("query", referenceQuerySchema),
  async (c) => {
    const hostKey = c.req.param("hostKey");
    const { token } = c.req.valid("query");
    if (!verifyReferenceToken(hostKey, token)) {
      throw new HTTPException(401, { message: "Invalid or expired link" });
    }

    const db = c.get("db");
    const service = await db.query.services.findFirst({
      where: eq(services.hostKey, hostKey),
    });
    if (!service) {
      throw new HTTPException(404, { message: "Service not found" });
    }
    const [spec] = await db
      .select()
      .from(apiSpecs)
      .where(eq(apiSpecs.serviceId, service.id))
      .orderBy(desc(apiSpecs.createdAt))
      .limit(1);
    if (!spec) {
      throw new HTTPException(404, { message: "No spec attached" });
    }

    const gatewayUrl = gatewayUrlFor(hostKey);
    const document = spec.document as Record<string, unknown>;
    const components = (document.components ?? {}) as Record<string, unknown>;
    return c.json({
      service: { name: service.name, hostKey },
      gatewayUrl,
      // servers + security are forced so the playground calls the gateway
      // with a "Bearer gw_…" key regardless of what the origin spec declares
      document: {
        ...document,
        servers: [{ url: gatewayUrl }],
        security: [{ keyfront: [] }],
        components: {
          ...components,
          securitySchemes: {
            ...((components.securitySchemes ?? {}) as Record<string, unknown>),
            keyfront: {
              type: "http",
              scheme: "bearer",
              description: "Keyfront API key (gw_live_… or gw_test_…)",
            },
          },
        },
      },
    });
  },
);
