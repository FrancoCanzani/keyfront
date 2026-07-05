CREATE TABLE "api_operations" (
	"id" text PRIMARY KEY NOT NULL,
	"service_id" text NOT NULL,
	"operation_id" text NOT NULL,
	"method" text NOT NULL,
	"path_template" text NOT NULL,
	"segments" jsonb NOT NULL,
	"summary" text,
	"tags" jsonb,
	"deprecated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_specs" (
	"id" text PRIMARY KEY NOT NULL,
	"service_id" text NOT NULL,
	"source" text NOT NULL,
	"source_url" text,
	"source_hash" text NOT NULL,
	"openapi_version" text NOT NULL,
	"title" text,
	"spec_version" text,
	"document" jsonb NOT NULL,
	"warnings" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "operation_id" text;--> statement-breakpoint
ALTER TABLE "api_operations" ADD CONSTRAINT "api_operations_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_specs" ADD CONSTRAINT "api_specs_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_operations_service_id_idx" ON "api_operations" USING btree ("service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_operations_service_method_path_idx" ON "api_operations" USING btree ("service_id","method","path_template");--> statement-breakpoint
CREATE INDEX "api_specs_service_id_idx" ON "api_specs" USING btree ("service_id");--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_operation_id_api_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."api_operations"("id") ON DELETE set null ON UPDATE no action;