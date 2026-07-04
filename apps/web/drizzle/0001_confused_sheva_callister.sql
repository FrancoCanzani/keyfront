CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"consumer_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"key_hash" text NOT NULL,
	"prefix" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "billing" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"stripe_customer_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "billing_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "consumers" (
	"id" text PRIMARY KEY NOT NULL,
	"service_id" text NOT NULL,
	"external_ref" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"service_id" text NOT NULL,
	"name" text NOT NULL,
	"rps" integer NOT NULL,
	"burst" integer NOT NULL,
	"monthly_quota" bigint,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"host_key" text NOT NULL,
	"origin_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "services_host_key_unique" UNIQUE("host_key")
);
--> statement-breakpoint
CREATE TABLE "usage_rollup" (
	"key_id" text NOT NULL,
	"window_start" timestamp NOT NULL,
	"count" bigint NOT NULL,
	CONSTRAINT "usage_rollup_key_id_window_start_pk" PRIMARY KEY("key_id","window_start")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_consumer_id_consumers_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."consumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing" ADD CONSTRAINT "billing_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumers" ADD CONSTRAINT "consumers_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_rollup" ADD CONSTRAINT "usage_rollup_key_id_api_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_consumer_id_idx" ON "api_keys" USING btree ("consumer_id");--> statement-breakpoint
CREATE INDEX "consumers_service_id_idx" ON "consumers" USING btree ("service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "consumers_service_external_ref_idx" ON "consumers" USING btree ("service_id","external_ref");--> statement-breakpoint
CREATE INDEX "plans_service_id_idx" ON "plans" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "services_organization_id_idx" ON "services" USING btree ("organization_id");