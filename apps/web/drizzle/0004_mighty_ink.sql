ALTER TABLE "consumer" RENAME TO "identity";--> statement-breakpoint
ALTER TABLE "identity" DROP CONSTRAINT "consumer_organization_id_organization_id_fk";
--> statement-breakpoint
ALTER TABLE "key" DROP CONSTRAINT "key_consumer_id_consumer_id_fk";
--> statement-breakpoint
ALTER TABLE "service" DROP CONSTRAINT "service_default_plan_id_plan_id_fk";
--> statement-breakpoint
DROP INDEX "consumer_organization_idx";--> statement-breakpoint
DROP INDEX "key_consumer_idx";--> statement-breakpoint
ALTER TABLE "identity" ADD COLUMN "external_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "identity" ADD COLUMN "meta" jsonb;--> statement-breakpoint
ALTER TABLE "key" ADD COLUMN "identity_id" text;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "service_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "identity" ADD CONSTRAINT "identity_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key" ADD CONSTRAINT "key_identity_id_identity_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identity"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan" ADD CONSTRAINT "plan_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "identity_org_external_id_idx" ON "identity" USING btree ("organization_id","external_id");--> statement-breakpoint
CREATE INDEX "identity_organization_idx" ON "identity" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "key_identity_idx" ON "key" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "plan_service_idx" ON "plan" USING btree ("service_id");--> statement-breakpoint
ALTER TABLE "identity" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "identity" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "key" DROP COLUMN "consumer_id";--> statement-breakpoint
ALTER TABLE "service" DROP COLUMN "default_plan_id";