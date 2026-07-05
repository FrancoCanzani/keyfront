import { Hono } from "hono";
import type { AppRouteEnv } from "../../../types";
import { deleteSpec } from "./delete";
import { getSpec } from "./get";
import { uploadSpec } from "./post";
import { syncSpec } from "./sync";

export const specsRoutes = new Hono<AppRouteEnv>()
  .route("/", getSpec)
  .route("/", uploadSpec)
  .route("/", syncSpec)
  .route("/", deleteSpec);
