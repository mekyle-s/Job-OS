CREATE TABLE "evidence_item" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_id" text,
	"item_type" text NOT NULL,
	"title" text NOT NULL,
	"company" text,
	"start_date" text,
	"end_date" text,
	"content" text,
	"metadata" jsonb,
	"confidence" real DEFAULT 1,
	"is_manual" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_source" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_type" text NOT NULL,
	"file_name" text,
	"file_url" text,
	"file_size" integer,
	"mime_type" text,
	"parse_status" text DEFAULT 'pending' NOT NULL,
	"parse_error" text,
	"raw_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evidence_item" ADD CONSTRAINT "evidence_item_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_item" ADD CONSTRAINT "evidence_item_source_id_evidence_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."evidence_source"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_source" ADD CONSTRAINT "evidence_source_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evidence_item_user_id_idx" ON "evidence_item" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "evidence_item_source_id_idx" ON "evidence_item" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "evidence_item_item_type_idx" ON "evidence_item" USING btree ("item_type");--> statement-breakpoint
CREATE INDEX "evidence_source_user_id_idx" ON "evidence_source" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "evidence_source_parse_status_idx" ON "evidence_source" USING btree ("parse_status");