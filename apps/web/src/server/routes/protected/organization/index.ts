import { Hono } from "hono";
import type { AppRouteEnv } from "../../../types";
import { organizationInfoRoute } from "./get-info";

export const organizationRoutes = new Hono<AppRouteEnv>().route("/", organizationInfoRoute);
