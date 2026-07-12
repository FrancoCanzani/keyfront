import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { plan } from "../../../db/schema/plan";
import { withRedis } from "../../../lib/redis";
import { deletePlan } from "../../../lib/sync";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";

function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23503"
  );
}

export const deletePlanRoute = new Hono<AppRouteEnv>().delete(
  "/:id",
  async (c) => {
    const organizationId = getOrganizationId(c);
    const db = c.get("db");
    const id = c.req.param("id");

    try {
      await db.transaction(async (tx) => {
        const [deleted] = await tx
          .delete(plan)
          .where(and(eq(plan.id, id), eq(plan.organizationId, organizationId)))
          .returning({ id: plan.id });

        if (!deleted) {
          throw new HTTPException(404, { message: "Plan not found" });
        }

        await withRedis((redis) => deletePlan(redis, deleted.id));
      });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new HTTPException(409, {
          message: "Plan is in use by one or more keys",
        });
      }
      throw error;
    }

    return c.json({ ok: true });
  },
);
