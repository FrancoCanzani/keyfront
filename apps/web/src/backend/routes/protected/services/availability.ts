import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { service } from "../../../db/schema/service";
import { serviceHost } from "../../../lib/hosts";
import { RESERVED_LABELS } from "../../../lib/reserved-labels";
import { getUser } from "../../../middleware/auth";
import type { AppRouteEnv } from "../../../types";
import { labelRegex } from "./schemas";

export const getAvailability = new Hono<AppRouteEnv>().get(
  "/availability",
  zValidator("query", z.object({ label: z.string() })),
  async (c) => {
    getUser(c);
    const db = c.get("db");
    const { label } = c.req.valid("query");

    if (!labelRegex.test(label)) {
      return c.json({ available: false as const, reason: "invalid" as const });
    }
    if (RESERVED_LABELS.has(label)) {
      return c.json({ available: false as const, reason: "reserved" as const });
    }

    const [existing] = await db
      .select({ id: service.id })
      .from(service)
      .where(eq(service.host, serviceHost(label)));

    if (existing) {
      return c.json({ available: false as const, reason: "taken" as const });
    }

    return c.json({ available: true as const });
  },
);
