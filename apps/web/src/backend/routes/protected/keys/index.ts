import { Hono } from "hono";
import type { AppRouteEnv } from "../../../types";
import { getAllKeys } from "./get-all";
import { postKey } from "./post";
import { revokeKey } from "./revoke";

export const keys = new Hono<AppRouteEnv>()
  .route("/", getAllKeys)
  .route("/", postKey)
  .route("/", revokeKey);
