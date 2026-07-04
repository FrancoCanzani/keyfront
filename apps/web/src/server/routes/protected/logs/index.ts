import { Hono } from "hono";
import type { AppRouteEnv } from "../../../types";
import { getLogs } from "./get";

export const logsRoutes = new Hono<AppRouteEnv>().route("/", getLogs);
