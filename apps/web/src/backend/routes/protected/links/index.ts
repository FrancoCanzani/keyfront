import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { link } from "../../../db/schema/link";
import { nanoid } from "../../../lib/nanoid";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { createLinkSchema, linkColumns } from "./schemas";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export const links = new Hono<AppRouteEnv>()
  .get("/", async (c) => {
    const organizationId = getOrganizationId(c);
    const db = c.get("db");

    const rows = await db
      .select(linkColumns)
      .from(link)
      .where(eq(link.organizationId, organizationId))
      .orderBy(desc(link.createdAt));

    return c.json(rows);
  })
  .post("/", zValidator("json", createLinkSchema), async (c) => {
    const organizationId = getOrganizationId(c);
    const db = c.get("db");
    const { url, key, expiresAt } = c.req.valid("json");

    const now = new Date();
    const attempts = key ? 1 : 5;

    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const [row] = await db
          .insert(link)
          .values({
            id: crypto.randomUUID(),
            organizationId,
            key: key ?? nanoid(),
            url,
            expiresAt,
            createdAt: now,
            updatedAt: now,
          })
          .returning(linkColumns);

        if (!row) {
          throw new HTTPException(500, { message: "Failed to create link" });
        }
        return c.json(row, 201);
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
        if (key) {
          throw new HTTPException(409, { message: "That key is taken" });
        }
      }
    }

    throw new HTTPException(500, {
      message: "Failed to generate a unique key",
    });
  })
  .delete(
    "/:id",
    zValidator("param", z.object({ id: z.uuid() })),
    async (c) => {
      const organizationId = getOrganizationId(c);
      const db = c.get("db");
      const { id } = c.req.valid("param");

      const [deleted] = await db
        .delete(link)
        .where(and(eq(link.id, id), eq(link.organizationId, organizationId)))
        .returning({ id: link.id });

      if (!deleted) {
        throw new HTTPException(404, { message: "Link not found" });
      }

      return c.json({ id: deleted.id });
    },
  );
