CREATE TABLE "job" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"source_job_id" text NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"location" text NOT NULL,
	"description" text NOT NULL,
	"url" text NOT NULL,
	"posted_at" timestamp with time zone,
	"source_updated_at" timestamp with time zone NOT NULL,
	"metadata" jsonb,
	"parse_status" text DEFAULT 'pending' NOT NULL,
	"parse_completed_at" timestamp with time zone,
	"parse_error" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_job_source" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"source_job_id" text NOT NULL,
	"raw_data" jsonb NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requirement" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"category" text NOT NULL,
	"priority" text NOT NULL,
	"normalized_text" text NOT NULL,
	"source_text" text NOT NULL,
	"source_span" text,
	"review_status" text DEFAULT 'parsed' NOT NULL,
	"is_manually_edited" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requirement_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"requirement_id" text NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"before_value" jsonb,
	"after_value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_criteria" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_function" text,
	"locations" jsonb,
	"visa_required" boolean,
	"target_companies" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_polled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "requirement" ADD CONSTRAINT "requirement_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_audit" ADD CONSTRAINT "requirement_audit_requirement_id_requirement_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_audit" ADD CONSTRAINT "requirement_audit_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_criteria" ADD CONSTRAINT "user_criteria_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_source_lookup_idx" ON "job" USING btree ("source","source_job_id");--> statement-breakpoint
CREATE INDEX "job_company_idx" ON "job" USING btree ("company");--> statement-breakpoint
CREATE INDEX "job_source_updated_at_idx" ON "job" USING btree ("source_updated_at");--> statement-breakpoint
CREATE INDEX "job_parse_status_idx" ON "job" USING btree ("parse_status");--> statement-breakpoint
CREATE INDEX "job_is_active_idx" ON "job" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "raw_job_source_lookup_idx" ON "raw_job_source" USING btree ("source","source_job_id");--> statement-breakpoint
CREATE INDEX "requirement_job_id_idx" ON "requirement" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "requirement_category_idx" ON "requirement" USING btree ("category");--> statement-breakpoint
CREATE INDEX "requirement_review_status_idx" ON "requirement" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "requirement_audit_requirement_id_idx" ON "requirement_audit" USING btree ("requirement_id");--> statement-breakpoint
CREATE INDEX "requirement_audit_user_id_idx" ON "requirement_audit" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_criteria_user_id_idx" ON "user_criteria" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_criteria_is_active_idx" ON "user_criteria" USING btree ("is_active");