import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";

export const link = pgTable(
  "link",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    key: text("key").notNull().unique(),
    url: text("url").notNull(),
    clicks: integer("clicks").notNull().default(0),
    lastClickedAt: timestamp("last_clicked_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [index("link_organization_id_idx").on(table.organizationId)],
);
