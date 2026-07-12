import { bigint, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { service } from "./service";

export const plan = pgTable(
  "plan",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    serviceId: text("service_id")
      .notNull()
      .references(() => service.id, { onDelete: "cascade" }),
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
  (t) => [
    index("plan_organization_idx").on(t.organizationId),
    index("plan_service_idx").on(t.serviceId),
  ],
);
