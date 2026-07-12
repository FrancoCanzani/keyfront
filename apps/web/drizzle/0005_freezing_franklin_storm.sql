CREATE UNIQUE INDEX "plan_service_id_unique_idx" ON "plan" USING btree ("service_id","id");--> statement-breakpoint
ALTER TABLE "key" DROP CONSTRAINT "key_plan_id_plan_id_fk";
--> statement-breakpoint
ALTER TABLE "key" ADD CONSTRAINT "key_service_plan_fk" FOREIGN KEY ("service_id","plan_id") REFERENCES "public"."plan"("service_id","id") ON DELETE restrict ON UPDATE no action;