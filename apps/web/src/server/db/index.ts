import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as auth from "./schema/auth";
import * as gateway from "./schema/gateway";

const schema = { ...auth, ...gateway };

const client = postgres(
  process.env.DATABASE_URL ?? "postgres://localhost/api_gateway",
);

export const db = drizzle(client, { schema });
export type Database = typeof db;

export async function checkDb(): Promise<boolean> {
  try {
    await client`select 1`;
    return true;
  } catch {
    return false;
  }
}
