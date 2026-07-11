import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { plan } from "./plan";

export const service = pgTable(
  "service",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    host: text("host").notNull(),
    upstream: text("upstream").notNull(),
    gatewaySecret: text("gateway_secret").notNull(),
    defaultPlanId: text("default_plan_id").references(() => plan.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("service_host_idx").on(t.host),
    index("service_organization_idx").on(t.organizationId),
  ],
);
