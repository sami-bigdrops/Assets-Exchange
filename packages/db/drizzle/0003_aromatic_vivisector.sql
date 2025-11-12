CREATE TABLE "metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"metric_type" text NOT NULL,
	"today_value" integer DEFAULT 0 NOT NULL,
	"yesterday_value" integer DEFAULT 0 NOT NULL,
	"current_month_value" integer DEFAULT 0 NOT NULL,
	"last_month_value" integer DEFAULT 0 NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;