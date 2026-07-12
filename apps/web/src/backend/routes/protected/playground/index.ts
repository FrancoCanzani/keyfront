import { Hono } from "hono";
import type { AppRouteEnv } from "../../../types";
import { postPlayground } from "./post";

export const playground = new Hono<AppRouteEnv>().route("/", postPlayground);
