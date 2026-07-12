import { Hono } from "hono";
import type { AppRouteEnv } from "../../../types";
import { getAvailability } from "./get-availability";
import { deleteService } from "./delete";
import { getService } from "./get";
import { getAllServices } from "./get-all";
import { patchService } from "./patch";
import { postService } from "./post";

export const services = new Hono<AppRouteEnv>()
  .route("/", getAvailability)
  .route("/", getAllServices)
  .route("/", postService)
  .route("/", getService)
  .route("/", patchService)
  .route("/", deleteService);
