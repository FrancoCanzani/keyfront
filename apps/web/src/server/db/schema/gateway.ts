import {
  bigint,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";

export const services = pgTable(
  "services",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    hostKey: text("host_key").notNull().unique(),
    originUrl: text("origin_url").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("services_organization_id_idx").on(t.organizationId)],
);

export const plans = pgTable(
  "plans",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    rps: integer("rps").notNull(),
    burst: integer("burst").notNull(),
    // null = unlimited
    monthlyQuota: bigint("monthly_quota", { mode: "number" }),
    priceCents: integer("price_cents").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("plans_service_id_idx").on(t.serviceId)],
);

export const consumers = pgTable(
  "consumers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    // the publisher's identifier for their customer (email, account id, …)
    externalRef: text("external_ref"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("consumers_service_id_idx").on(t.serviceId),
    uniqueIndex("consumers_service_external_ref_idx").on(
      t.serviceId,
      t.externalRef,
    ),
  ],
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    consumerId: text("consumer_id")
      .notNull()
      .references(() => consumers.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    // sha256 of the raw key; the raw key is shown once at creation
    keyHash: text("key_hash").notNull().unique(),
    // display fragment, e.g. "gw_live_a1b2"
    prefix: text("prefix").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at"),
  },
  (t) => [index("api_keys_consumer_id_idx").on(t.consumerId)],
);

export const usageRollup = pgTable(
  "usage_rollup",
  {
    keyId: text("key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    windowStart: timestamp("window_start").notNull(),
    count: bigint("count", { mode: "number" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.keyId, t.windowStart] })],
);

export const billing = pgTable("billing", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").unique(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
