import {
  pgTable,
  text,
  timestamp,
  uuid,
  json,
  pgEnum,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";

import type { UIMessage } from "ai";

export const db = drizzle(process.env.DATABASE_URL!);

export const appsTable = pgTable("apps", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().default("Unnamed App"),
  description: text("description").notNull().default("No description"),
  gitRepo: text("git_repo").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  baseId: text("base_id").notNull().default("nextjs-dkjfgdf"),
  previewDomain: text("preview_domain").unique(),
});

export const appPermissions = pgEnum("app_user_permission", [
  "read",
  "write",
  "admin",
]);

export const appUsers = pgTable("app_users", {
  userId: text("user_id").notNull(),
  appId: uuid("app_id")
    .notNull()
    .references(() => appsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  permissions: appPermissions("permissions"),
  freestyleIdentity: text("freestyle_identity").notNull(),
  freestyleAccessToken: text("freestyle_access_token").notNull(),
  freestyleAccessTokenId: text("freestyle_access_token_id").notNull(),
});

export const messagesTable = pgTable("messages", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  appId: uuid("app_id")
    .notNull()
    .references(() => appsTable.id),
  message: json("message").notNull().$type<UIMessage>(),
});

export const appDeployments = pgTable("app_deployments", {
  appId: uuid("app_id")
    .notNull()
    .references(() => appsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deploymentId: text("deployment_id").notNull(),
  commit: text("commit").notNull(), // sha of the commit
});

// Stripe Integration Tables

export const planTypeEnum = pgEnum("plan_type", [
  "free",
  "pro", 
  "team",
  "enterprise"
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled", 
  "past_due",
  "unpaid"
]);

export const billingEventStatusEnum = pgEnum("billing_event_status", [
  "pending",
  "completed",
  "failed",
  "refunded"
]);

export const subscriptionsTable = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeCustomerId: text("stripe_customer_id"),
  planType: planTypeEnum("plan_type").notNull(),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const creditsTable = pgTable("credits", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  balance: integer("balance").notNull().default(0),
  totalEarned: integer("total_earned").notNull().default(0),
  totalUsed: integer("total_used").notNull().default(0),
  lastRefreshDate: timestamp("last_refresh_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const usageLogsTable = pgTable("usage_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  appId: uuid("app_id").notNull(),
  creditsUsed: integer("credits_used").notNull().default(1),
  messageLength: integer("message_length"),
  operationType: text("operation_type").notNull().default("chat_message"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const billingEventsTable = pgTable("billing_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  subscriptionId: uuid("subscription_id").references(() => subscriptionsTable.id),
  stripeEventId: text("stripe_event_id").unique(),
  eventType: text("event_type").notNull(),
  amount: integer("amount"), // Amount in cents
  currency: text("currency").notNull().default("EUR"),
  status: billingEventStatusEnum("status").notNull().default("pending"),
  metadata: json("metadata"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const planConfigurationsTable = pgTable("plan_configurations", {
  id: uuid("id").primaryKey().defaultRandom(),
  planType: planTypeEnum("plan_type").notNull().unique(),
  name: text("name").notNull(),
  priceMonthly: integer("price_monthly").notNull(), // Price in cents
  creditsMonthly: integer("credits_monthly").notNull(),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  features: json("features"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
