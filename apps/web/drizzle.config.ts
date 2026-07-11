import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/backend/db/schema",
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      `postgres://${process.env.USER ?? "postgres"}@localhost/api_gateway`,
  },
});
