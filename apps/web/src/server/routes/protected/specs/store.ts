import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Database } from "../../../db";
import { apiOperations, apiSpecs, services } from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import { ingestSpec } from "../../../lib/openapi";
import type { AppRouteEnv } from "../../../types";

export async function requireService(
  c: Context<AppRouteEnv>,
  serviceId: string,
) {
  const organizationId = getOrganizationId(c);
  const service = await c.get("db").query.services.findFirst({
    where: and(
      eq(services.id, serviceId),
      eq(services.organizationId, organizationId),
    ),
  });
  if (!service) {
    throw new HTTPException(404, { message: "Service not found" });
  }
  return service;
}

export async function latestSpec(db: Database, serviceId: string) {
  const [spec] = await db
    .select()
    .from(apiSpecs)
    .where(eq(apiSpecs.serviceId, serviceId))
    .orderBy(desc(apiSpecs.createdAt))
    .limit(1);
  return spec ?? null;
}

export function specMeta(
  spec: typeof apiSpecs.$inferSelect,
  operationsCount: number,
) {
  return {
    id: spec.id,
    source: spec.source,
    sourceUrl: spec.sourceUrl,
    openapiVersion: spec.openapiVersion,
    title: spec.title,
    specVersion: spec.specVersion,
    warnings: spec.warnings ?? [],
    operationsCount,
    createdAt: spec.createdAt,
  };
}

export async function storeSpec(
  db: Database,
  serviceId: string,
  raw: string,
  source: "upload" | "url",
  sourceUrl: string | null,
) {
  const ingested = await ingestSpec(raw);

  const previous = await latestSpec(db, serviceId);
  if (previous && previous.sourceHash === ingested.sourceHash) {
    return { spec: previous, operationsCount: ingested.operations.length, unchanged: true };
  }

  const [spec] = await db
    .insert(apiSpecs)
    .values({
      serviceId,
      source,
      sourceUrl,
      sourceHash: ingested.sourceHash,
      openapiVersion: ingested.openapiVersion,
      title: ingested.title,
      specVersion: ingested.specVersion,
      document: ingested.document,
      warnings: ingested.warnings,
    })
    .returning();

  const existing = await db
    .select({
      id: apiOperations.id,
      method: apiOperations.method,
      pathTemplate: apiOperations.pathTemplate,
    })
    .from(apiOperations)
    .where(eq(apiOperations.serviceId, serviceId));
  const keep = new Set(
    ingested.operations.map((op) => `${op.method} ${op.pathTemplate}`),
  );
  const stale = existing
    .filter((op) => !keep.has(`${op.method} ${op.pathTemplate}`))
    .map((op) => op.id);

  for (let i = 0; i < ingested.operations.length; i += 200) {
    const chunk = ingested.operations.slice(i, i + 200);
    await db
      .insert(apiOperations)
      .values(chunk.map((op) => ({ ...op, serviceId })))
      .onConflictDoUpdate({
        target: [
          apiOperations.serviceId,
          apiOperations.method,
          apiOperations.pathTemplate,
        ],
        set: {
          operationId: sql`excluded.operation_id`,
          segments: sql`excluded.segments`,
          summary: sql`excluded.summary`,
          tags: sql`excluded.tags`,
          deprecated: sql`excluded.deprecated`,
          updatedAt: new Date(),
        },
      });
  }
  if (stale.length > 0) {
    await db.delete(apiOperations).where(inArray(apiOperations.id, stale));
  }

  return { spec, operationsCount: ingested.operations.length, unchanged: false };
}
