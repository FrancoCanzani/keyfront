export const config = {
  port: Number(process.env.PORT ?? 8080),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://localhost/api_gateway",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
};
