CREATE TABLE "parser_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"parser_confidence" real,
	"before_value" jsonb,
	"after_value" jsonb,
	"source" text DEFAULT 'user' NOT NULL,
	"user_feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_status" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"status" text NOT NULL,
	"notes" text,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "parser_audit" ADD CONSTRAINT "parser_audit_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_status" ADD CONSTRAINT "role_status_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_status" ADD CONSTRAINT "role_status_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "parser_audit_user_id_idx" ON "parser_audit" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "parser_audit_entity_idx" ON "parser_audit" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "parser_audit_created_at_idx" ON "parser_audit" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "role_status_user_id_idx" ON "role_status" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "role_status_job_id_idx" ON "role_status" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "role_status_status_idx" ON "role_status" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "role_status_user_job_idx" ON "role_status" USING btree ("user_id","job_id");