CREATE TABLE "usage_rollup_daily" (
	"key_id" text NOT NULL,
	"day" timestamp NOT NULL,
	"count" bigint NOT NULL,
	"ok_count" bigint DEFAULT 0 NOT NULL,
	"err4_count" bigint DEFAULT 0 NOT NULL,
	"err5_count" bigint DEFAULT 0 NOT NULL,
	"latency_ms_sum" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "usage_rollup_daily_key_id_day_pk" PRIMARY KEY("key_id","day")
);
--> statement-breakpoint
ALTER TABLE "usage_rollup_daily" ADD CONSTRAINT "usage_rollup_daily_key_id_api_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usage_rollup_window_start_idx" ON "usage_rollup" USING btree ("window_start");