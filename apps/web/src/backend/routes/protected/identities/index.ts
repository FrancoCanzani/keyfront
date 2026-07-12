import { Hono } from "hono";
import type { AppRouteEnv } from "../../../types";
import { deleteIdentity } from "./delete";
import { getAllIdentities } from "./get-all";
import { postIdentity } from "./post";

export const identities = new Hono<AppRouteEnv>()
  .route("/", getAllIdentities)
  .route("/", postIdentity)
  .route("/", deleteIdentity);
