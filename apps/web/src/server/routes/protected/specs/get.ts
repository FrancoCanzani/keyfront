import { zValidator } from "@hono/zod-validator";
import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { apiOperations } from "../../../db/schema/gateway";
import { docsUrl, gatewayUrlFor } from "../../../lib/gateway-url";
import { mintReferenceToken } from "../../../lib/reference-token";
import type { AppRouteEnv } from "../../../types";
import { specQuerySchema } from "./schemas";
import { latestSpec, requireService, specMeta } from "./store";

export const getSpec = new Hono<AppRouteEnv>().get(
  "/",
  zValidator("query", specQuerySchema),
  async (c) => {
    const { serviceId } = c.req.valid("query");
    const service = await requireService(c, serviceId);
    const spec = await latestSpec(c.get("db"), serviceId);
    if (!spec) {
      return c.json({
        spec: null,
        operations: [],
        previewUrl: null,
        gatewayUrl: gatewayUrlFor(service.hostKey),
      });
    }

    const operations = await c
      .get("db")
      .select({
        id: apiOperations.id,
        operationId: apiOperations.operationId,
        method: apiOperations.method,
        pathTemplate: apiOperations.pathTemplate,
        summary: apiOperations.summary,
        tags: apiOperations.tags,
        deprecated: apiOperations.deprecated,
      })
      .from(apiOperations)
      .where(eq(apiOperations.serviceId, serviceId))
      .orderBy(asc(apiOperations.pathTemplate), asc(apiOperations.method));

    const token = mintReferenceToken(service.hostKey);
    return c.json({
      spec: specMeta(spec, operations.length),
      operations,
      previewUrl: `${docsUrl()}/r/${service.hostKey}/access?token=${encodeURIComponent(token)}`,
      gatewayUrl: gatewayUrlFor(service.hostKey),
    });
  },
);
