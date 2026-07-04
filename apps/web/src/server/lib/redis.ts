import { Redis } from "ioredis";

// workerd forbids reusing a socket across requests, so every caller gets a
// fresh connection; commandTimeout keeps a dead socket from hanging a loader
export function createRedis() {
  return new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    connectTimeout: 2000,
    commandTimeout: 3000,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => (times > 2 ? null : 200),
  });
}

export async function withRedis<T>(
  fn: (redis: Redis) => Promise<T>,
): Promise<T> {
  const redis = createRedis();
  try {
    return await fn(redis);
  } finally {
    redis.disconnect();
  }
}
