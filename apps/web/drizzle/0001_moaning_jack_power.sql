CREATE TABLE "consumer" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "key" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"consumer_id" text NOT NULL,
	"service_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "plan" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"rate_limit" integer NOT NULL,
	"burst" integer NOT NULL,
	"monthly_quota" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"host" text NOT NULL,
	"upstream" text NOT NULL,
	"gateway_secret" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_rollup" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"key_id" text NOT NULL,
	"service_id" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"requests" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consumer" ADD CONSTRAINT "consumer_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key" ADD CONSTRAINT "key_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key" ADD CONSTRAINT "key_consumer_id_consumer_id_fk" FOREIGN KEY ("consumer_id") REFERENCES "public"."consumer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key" ADD CONSTRAINT "key_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key" ADD CONSTRAINT "key_plan_id_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan" ADD CONSTRAINT "plan_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service" ADD CONSTRAINT "service_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_rollup" ADD CONSTRAINT "usage_rollup_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_rollup" ADD CONSTRAINT "usage_rollup_key_id_key_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."key"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_rollup" ADD CONSTRAINT "usage_rollup_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consumer_organization_idx" ON "consumer" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "key_hash_idx" ON "key" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "key_organization_idx" ON "key" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "key_consumer_idx" ON "key" USING btree ("consumer_id");--> statement-breakpoint
CREATE INDEX "key_service_idx" ON "key" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "plan_organization_idx" ON "plan" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_host_idx" ON "service" USING btree ("host");--> statement-breakpoint
CREATE INDEX "service_organization_idx" ON "service" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_rollup_key_period_idx" ON "usage_rollup" USING btree ("key_id","period_start");--> statement-breakpoint
CREATE INDEX "usage_rollup_organization_idx" ON "usage_rollup" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "usage_rollup_service_idx" ON "usage_rollup" USING btree ("service_id");