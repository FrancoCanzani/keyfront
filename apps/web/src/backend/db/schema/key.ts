import {
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { identity } from "./identity";
import { plan } from "./plan";
import { service } from "./service";

export const key = pgTable(
  "key",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    identityId: text("identity_id").references(() => identity.id, {
      onDelete: "set null",
    }),
    serviceId: text("service_id")
      .notNull()
      .references(() => service.id, { onDelete: "cascade" }),
    planId: text("plan_id").notNull(),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at"),
    revokedAt: timestamp("revoked_at"),
  },
  (t) => [
    uniqueIndex("key_hash_idx").on(t.keyHash),
    index("key_organization_idx").on(t.organizationId),
    index("key_identity_idx").on(t.identityId),
    index("key_service_idx").on(t.serviceId),
    foreignKey({
      name: "key_service_plan_fk",
      columns: [t.serviceId, t.planId],
      foreignColumns: [plan.serviceId, plan.id],
    }).onDelete("restrict"),
  ],
);
