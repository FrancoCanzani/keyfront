import Redis from "ioredis";
import { config } from "./config";

export const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 1 });

export async function checkRedis(): Promise<boolean> {
  try {
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
}
