import { Hono } from "hono";
import type { AppRouteEnv } from "../../../types";
import { deletePlan } from "./delete";
import { getPlans } from "./get";
import { updatePlan } from "./patch";
import { createPlan } from "./post";

export const plansRoutes = new Hono<AppRouteEnv>()
  .route("/", getPlans)
  .route("/", createPlan)
  .route("/", updatePlan)
  .route("/", deletePlan);
