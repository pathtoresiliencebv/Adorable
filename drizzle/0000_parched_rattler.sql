CREATE TYPE "public"."app_user_permission" AS ENUM('read', 'write', 'admin');--> statement-breakpoint
CREATE TYPE "public"."billing_event_status" AS ENUM('pending', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."plan_type" AS ENUM('free', 'pro', 'team', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due', 'unpaid');--> statement-breakpoint
CREATE TABLE "app_deployments" (
	"app_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deployment_id" text NOT NULL,
	"commit" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_users" (
	"user_id" text NOT NULL,
	"app_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"permissions" "app_user_permission",
	"freestyle_identity" text NOT NULL,
	"freestyle_access_token" text NOT NULL,
	"freestyle_access_token_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text DEFAULT 'Unnamed App' NOT NULL,
	"description" text DEFAULT 'No description' NOT NULL,
	"git_repo" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"base_id" text DEFAULT 'nextjs-dkjfgdf' NOT NULL,
	"preview_domain" text,
	CONSTRAINT "apps_preview_domain_unique" UNIQUE("preview_domain")
);
--> statement-breakpoint
CREATE TABLE "billing_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"subscription_id" uuid,
	"stripe_event_id" text,
	"event_type" text NOT NULL,
	"amount" integer,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"status" "billing_event_status" DEFAULT 'pending' NOT NULL,
	"metadata" json,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "billing_events_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
CREATE TABLE "credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"total_earned" integer DEFAULT 0 NOT NULL,
	"total_used" integer DEFAULT 0 NOT NULL,
	"last_refresh_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "credits_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"app_id" uuid NOT NULL,
	"message" json NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_type" "plan_type" NOT NULL,
	"name" text NOT NULL,
	"price_monthly" integer NOT NULL,
	"credits_monthly" integer NOT NULL,
	"stripe_product_id" text,
	"stripe_price_id" text,
	"features" json,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plan_configurations_plan_type_unique" UNIQUE("plan_type")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"stripe_subscription_id" text,
	"stripe_customer_id" text,
	"plan_type" "plan_type" NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"app_id" uuid NOT NULL,
	"credits_used" integer DEFAULT 1 NOT NULL,
	"message_length" integer,
	"operation_type" text DEFAULT 'chat_message' NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_deployments" ADD CONSTRAINT "app_deployments_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;