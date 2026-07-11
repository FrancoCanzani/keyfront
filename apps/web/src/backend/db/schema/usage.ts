import { bigint, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { key } from "./key";
import { service } from "./service";

export const usageRollup = pgTable(
  "usage_rollup",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    keyId: text("key_id")
      .notNull()
      .references(() => key.id, { onDelete: "cascade" }),
    serviceId: text("service_id")
      .notNull()
      .references(() => service.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start").notNull(),
    requests: bigint("requests", { mode: "number" }).notNull().default(0),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("usage_rollup_key_period_idx").on(t.keyId, t.periodStart),
    index("usage_rollup_organization_idx").on(t.organizationId),
    index("usage_rollup_service_idx").on(t.serviceId),
  ],
);
