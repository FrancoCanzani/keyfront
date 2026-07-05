import { sql } from "drizzle-orm";
import { createDatabase } from "./db";

// run once right after the usage_rollup_daily migration: bun run backfill:usage-daily

const { db, close } = createDatabase();

await db.execute(sql`
  insert into usage_rollup_daily (key_id, day, count, ok_count, err4_count, err5_count, latency_ms_sum)
  select key_id, date_trunc('day', window_start), sum(count), sum(ok_count), sum(err4_count), sum(err5_count), sum(latency_ms_sum)
  from usage_rollup
  group by key_id, date_trunc('day', window_start)
  on conflict (key_id, day) do nothing
`);

console.log("usage_rollup_daily backfilled");
await close();
process.exit(0);
