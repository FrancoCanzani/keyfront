import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { services } from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import { syncRoute } from "../../../lib/sync";
import type { AppRouteEnv } from "../../../types";
import { createServiceSchema } from "./schemas";

export const createService = new Hono<AppRouteEnv>().post(
  "/",
  zValidator("json", createServiceSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const input = c.req.valid("json");
    try {
      const [row] = await c
        .get("db")
        .insert(services)
        .values({ ...input, organizationId })
        .returning();
      await syncRoute(row);
      return c.json(row, 201);
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        throw new HTTPException(409, { message: "Host key already taken" });
      }
      throw error;
    }
  },
);
