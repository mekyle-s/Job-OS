CREATE TABLE "matching_run" (
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"last_run_at" timestamp with time zone NOT NULL,
	CONSTRAINT "matching_run_user_id_job_id_pk" PRIMARY KEY("user_id","job_id")
);
--> statement-breakpoint
ALTER TABLE "matching_run" ADD CONSTRAINT "matching_run_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matching_run" ADD CONSTRAINT "matching_run_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DELETE FROM "evidence_mapping" a
USING "evidence_mapping" b
WHERE a."user_id" = b."user_id"
  AND a."requirement_id" = b."requirement_id"
  AND a."evidence_item_id" = b."evidence_item_id"
  AND (a."created_at" > b."created_at" OR (a."created_at" = b."created_at" AND a."id" > b."id"));--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_mapping_user_pair_idx" ON "evidence_mapping" USING btree ("user_id","requirement_id","evidence_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evidence_item_embedding_hnsw_idx" ON "evidence_item" USING hnsw ("embedding" vector_cosine_ops) WITH (m = 16, ef_construction = 64);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "requirement_embedding_hnsw_idx" ON "requirement" USING hnsw ("embedding" vector_cosine_ops) WITH (m = 16, ef_construction = 64);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_company_lower_idx" ON "job" (lower("company"));