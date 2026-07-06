ALTER TABLE "user_criteria" ADD COLUMN "job_types" jsonb;--> statement-breakpoint
CREATE INDEX "job_role_type_idx" ON "job" USING btree ("role_type");