CREATE TABLE "charities" (
	"ein" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"mission" text,
	"description" text,
	"cause" text,
	"city" text,
	"state" text,
	"revenue" bigint,
	"website" text,
	"logo_url" text,
	"embedding_text" text,
	"content_hash" text,
	"embedding" vector(1024),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"slug" text PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "charities_embedding_idx" ON "charities" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "charities_name_trgm_idx" ON "charities" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "charities_cause_idx" ON "charities" USING btree ("cause");--> statement-breakpoint
CREATE INDEX "charities_state_idx" ON "charities" USING btree ("state");