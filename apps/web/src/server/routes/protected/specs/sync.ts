import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { SpecError } from "../../../lib/openapi";
import { fetchSpecUrl } from "../../../lib/spec-fetch";
import type { AppRouteEnv } from "../../../types";
import { syncSpecSchema } from "./schemas";
import { latestSpec, requireService, specMeta, storeSpec } from "./store";

export const syncSpec = new Hono<AppRouteEnv>().post(
  "/sync",
  zValidator("json", syncSpecSchema),
  async (c) => {
    const { serviceId } = c.req.valid("json");
    await requireService(c, serviceId);
    const current = await latestSpec(c.get("db"), serviceId);
    if (!current) {
      throw new HTTPException(404, { message: "No spec to sync" });
    }
    if (current.source !== "url" || !current.sourceUrl) {
      throw new HTTPException(400, {
        message: "This spec was uploaded directly; replace it instead",
      });
    }
    try {
      const raw = await fetchSpecUrl(current.sourceUrl);
      const { spec, operationsCount, unchanged } = await storeSpec(
        c.get("db"),
        serviceId,
        raw,
        "url",
        current.sourceUrl,
      );
      return c.json({ spec: specMeta(spec, operationsCount), unchanged });
    } catch (error) {
      if (error instanceof SpecError) {
        throw new HTTPException(422, { message: error.message });
      }
      throw error;
    }
  },
);
