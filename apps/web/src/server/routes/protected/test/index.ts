import { Hono } from "hono";
import type { AppRouteEnv } from "../../../types";
import { createTestKey } from "./post-key";
import { testRequest } from "./post";

export const testRoutes = new Hono<AppRouteEnv>()
  .route("/", testRequest)
  .route("/", createTestKey);
