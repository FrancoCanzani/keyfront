import { bigint, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organization } from "./auth";

export const plan = pgTable(
  "plan",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    rateLimit: integer("rate_limit").notNull(),
    burst: integer("burst").notNull(),
    monthlyQuota: bigint("monthly_quota", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("plan_organization_idx").on(t.organizationId)],
);
