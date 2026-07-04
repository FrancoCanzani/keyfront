import { Hono } from "hono";
import type { AppRouteEnv } from "../../../types";
import { getConsumers } from "./get";
import { createConsumer } from "./post";

export const consumersRoutes = new Hono<AppRouteEnv>()
  .route("/", getConsumers)
  .route("/", createConsumer);
