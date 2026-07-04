import { Hono } from "hono";
import type { AppRouteEnv } from "../../../types";
import { getUsage } from "./get";

export const usageRoutes = new Hono<AppRouteEnv>().route("/", getUsage);
