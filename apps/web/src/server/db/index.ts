import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as auth from "./schema/auth";
import * as gateway from "./schema/gateway";

const schema = { ...auth, ...gateway };

export function createDatabase() {
  const client = postgres(
    process.env.DATABASE_URL ??
      `postgres://${process.env.USER ?? "postgres"}@localhost/api_gateway`,
  );
  return {
    db: drizzle(client, { schema }),
    close: () => client.end(),
  };
}

export type Database = ReturnType<typeof createDatabase>["db"];

export async function checkDb(db: Database): Promise<boolean> {
  try {
    await db.execute("select 1");
    return true;
  } catch {
    return false;
  }
}
