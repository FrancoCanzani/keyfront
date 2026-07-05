import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { SpecError } from "../../../lib/openapi";
import { fetchSpecUrl } from "../../../lib/spec-fetch";
import type { AppRouteEnv } from "../../../types";
import { uploadSpecSchema } from "./schemas";
import { requireService, specMeta, storeSpec } from "./store";

export const uploadSpec = new Hono<AppRouteEnv>().post(
  "/",
  zValidator("json", uploadSpecSchema),
  async (c) => {
    const input = c.req.valid("json");
    await requireService(c, input.serviceId);
    try {
      const raw = input.content ?? (await fetchSpecUrl(input.url ?? ""));
      const { spec, operationsCount, unchanged } = await storeSpec(
        c.get("db"),
        input.serviceId,
        raw,
        input.url ? "url" : "upload",
        input.url ?? null,
      );
      return c.json(
        { spec: specMeta(spec, operationsCount), unchanged },
        unchanged ? 200 : 201,
      );
    } catch (error) {
      if (error instanceof SpecError) {
        throw new HTTPException(422, { message: error.message });
      }
      throw error;
    }
  },
);
