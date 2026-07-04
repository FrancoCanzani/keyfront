import { Hono } from "hono";
import type { AppRouteEnv } from "../../../types";
import { getKeys } from "./get";
import { revokeKey } from "./patch";
import { createKey } from "./post";

export const keysRoutes = new Hono<AppRouteEnv>()
  .route("/", getKeys)
  .route("/", createKey)
  .route("/", revokeKey);
