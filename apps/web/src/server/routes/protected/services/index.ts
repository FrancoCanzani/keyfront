import { Hono } from "hono";
import type { AppRouteEnv } from "../../../types";
import { deleteService } from "./delete";
import { getServices } from "./get";
import { updateService } from "./patch";
import { createService } from "./post";

export const servicesRoutes = new Hono<AppRouteEnv>()
  .route("/", getServices)
  .route("/", createService)
  .route("/", updateService)
  .route("/", deleteService);
