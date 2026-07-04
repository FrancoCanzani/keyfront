import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { consumers, services } from "../../../db/schema/gateway";
import { getOrganizationId } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { createConsumerSchema } from "./schemas";

export const createConsumer = new Hono<AppRouteEnv>().post(
  "/",
  zValidator("json", createConsumerSchema),
  async (c) => {
    const organizationId = getOrganizationId(c);
    const input = c.req.valid("json");

    const [service] = await c
      .get("db")
      .select({ id: services.id })
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

    try {
      const [row] = await c
        .get("db")
        .insert(consumers)
        .values(input)
        .returning();
      return c.json(row, 201);
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        throw new HTTPException(409, {
          message: "A consumer with this reference already exists",
        });
      }
      throw error;
    }
  },
);
