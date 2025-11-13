import { pgTable, text, timestamp, uuid, jsonb, boolean, integer } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const personalizations = pgTable("personalizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  logo: text("logo"),
  favicon: text("favicon"),
  secondaryLogo: text("secondary_logo"),
  colors: jsonb("colors").$type<{
    background: string;
    bodyText: string;
    title: string;
    heading: string;
    sidebarHoverBackground: string;
    sidebarHoverText: string;
    sectionHeaderBackground: string;
    sectionHeadingTextColor: string;
  }>(),
  buttonColors: jsonb("button_colors").$type<{
    primaryButton: string;
    primaryButtonText: string;
    secondaryButton: string;
    secondaryButtonText: string;
    destructiveButton: string;
    destructiveButtonText: string;
  }>(),
  metricCardColors: jsonb("metric_card_colors").$type<{
    cardBackground: string;
    cardTitle: string;
    totalAssetsIconBg: string;
    totalAssetsIconColor: string;
    newRequestsIconBg: string;
    newRequestsIconColor: string;
    approvedAssetsIconBg: string;
    approvedAssetsIconColor: string;
    rejectedAssetsIconBg: string;
    rejectedAssetsIconColor: string;
    pendingApprovalIconBg: string;
    pendingApprovalIconColor: string;
  }>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const metrics = pgTable("metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  metricType: text("metric_type").notNull(),
  todayValue: integer("today_value").default(0).notNull(),
  yesterdayValue: integer("yesterday_value").default(0).notNull(),
  currentMonthValue: integer("current_month_value").default(0).notNull(),
  lastMonthValue: integer("last_month_value").default(0).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});