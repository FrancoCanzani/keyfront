import { Hono } from "hono";
import type { AppRouteEnv } from "../../../types";
import { getReference } from "./get";

export const referenceRoutes = new Hono<AppRouteEnv>().route("/", getReference);
