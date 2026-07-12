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

type Availability =
  | { available: false; reason: "invalid" | "reserved" | "taken" }
  | { available: true };

export const getAvailability = new Hono<AppRouteEnv>().get(
  "/availability",
  zValidator("query", z.object({ label: z.string() })),
  async (c) => {
    getUser(c);
    const db = c.get("db");
    const { label } = c.req.valid("query");

    if (!labelRegex.test(label)) {
      return c.json<Availability>({ available: false, reason: "invalid" });
    }
    if (RESERVED_LABELS.has(label)) {
      return c.json<Availability>({ available: false, reason: "reserved" });
    }

    const [existing] = await db
      .select({ id: service.id })
      .from(service)
      .where(eq(service.host, serviceHost(label)));

    if (existing) {
      return c.json<Availability>({ available: false, reason: "taken" });
    }

    return c.json<Availability>({ available: true });
  },
);
