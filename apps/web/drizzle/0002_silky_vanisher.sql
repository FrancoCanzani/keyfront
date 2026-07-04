ALTER TABLE "usage_rollup" ADD COLUMN "ok_count" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_rollup" ADD COLUMN "err4_count" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_rollup" ADD COLUMN "err5_count" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_rollup" ADD COLUMN "latency_ms_sum" bigint DEFAULT 0 NOT NULL;