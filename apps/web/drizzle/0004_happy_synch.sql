CREATE TABLE "request_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"service_id" text NOT NULL,
	"key_id" text,
	"ts" timestamp NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"status" integer NOT NULL,
	"outcome" text,
	"region" text,
	"user_agent" text,
	"ms" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "short_token" text;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "environment" text DEFAULT 'live' NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "meta" jsonb;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "rps" integer;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "burst" integer;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "ip_allowlist" jsonb;--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_key_id_api_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "request_logs_service_ts_idx" ON "request_logs" USING btree ("service_id","ts");--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_short_token_unique" UNIQUE("short_token");