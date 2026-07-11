import { Hono } from "hono";
import type { AppRouteEnv } from "../../../types";
import { deletePlanRoute } from "./delete";
import { getPlan } from "./get";
import { getAllPlans } from "./get-all";
import { patchPlan } from "./patch";
import { postPlan } from "./post";

export const plans = new Hono<AppRouteEnv>()
  .route("/", getAllPlans)
  .route("/", postPlan)
  .route("/", getPlan)
  .route("/", patchPlan)
  .route("/", deletePlanRoute);
