import Redis from "ioredis";

export async function withRedis<T>(fn: (redis: Redis) => Promise<T>): Promise<T> {
  const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 1,
  });
  try {
    return await fn(redis);
  } finally {
    await redis.quit();
  }
}
