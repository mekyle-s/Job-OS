CREATE TABLE "evidence_mapping" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"requirement_id" text NOT NULL,
	"evidence_item_id" text NOT NULL,
	"decision" text NOT NULL,
	"confidence_band" text NOT NULL,
	"reason" text NOT NULL,
	"needs_review" boolean DEFAULT false NOT NULL,
	"source_requirement_text" text NOT NULL,
	"source_evidence_excerpt" text NOT NULL,
	"embedding_model_version" text NOT NULL,
	"matching_prompt_version" text NOT NULL,
	"llm_model_version" text NOT NULL,
	"created_by_system" boolean DEFAULT true NOT NULL,
	"manual_override_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_mapping_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"mapping_id" text NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"before_value" jsonb,
	"after_value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evidence_item" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "visa_sponsorship" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "remote_policy" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "role_type" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "season" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "graduation_window" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "last_matched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "requirement" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "evidence_mapping" ADD CONSTRAINT "evidence_mapping_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_mapping" ADD CONSTRAINT "evidence_mapping_requirement_id_requirement_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_mapping" ADD CONSTRAINT "evidence_mapping_evidence_item_id_evidence_item_id_fk" FOREIGN KEY ("evidence_item_id") REFERENCES "public"."evidence_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_mapping_audit" ADD CONSTRAINT "evidence_mapping_audit_mapping_id_evidence_mapping_id_fk" FOREIGN KEY ("mapping_id") REFERENCES "public"."evidence_mapping"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_mapping_audit" ADD CONSTRAINT "evidence_mapping_audit_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evidence_mapping_user_id_idx" ON "evidence_mapping" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "evidence_mapping_requirement_id_idx" ON "evidence_mapping" USING btree ("requirement_id");--> statement-breakpoint
CREATE INDEX "evidence_mapping_evidence_item_id_idx" ON "evidence_mapping" USING btree ("evidence_item_id");--> statement-breakpoint
CREATE INDEX "evidence_mapping_needs_review_idx" ON "evidence_mapping" USING btree ("needs_review");--> statement-breakpoint
CREATE INDEX "evidence_mapping_audit_mapping_id_idx" ON "evidence_mapping_audit" USING btree ("mapping_id");--> statement-breakpoint
CREATE INDEX "evidence_mapping_audit_user_id_idx" ON "evidence_mapping_audit" USING btree ("user_id");