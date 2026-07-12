import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { identity } from "../../../db/schema/identity";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { createIdentitySchema } from "./schemas";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export const postIdentity = new Hono<AppRouteEnv>().post(
  "/",
  zValidator("json", createIdentitySchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const db = c.get("db");
    const { externalId, meta } = c.req.valid("json");

    let created;
    try {
      [created] = await db
        .insert(identity)
        .values({ organizationId, externalId, meta: meta ?? null })
        .returning();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new HTTPException(409, {
          message: "An identity with that external ID already exists",
        });
      }
      throw error;
    }

    if (!created) {
      throw new HTTPException(500, { message: "Failed to create identity" });
    }

    return c.json(created, 201);
  },
);
