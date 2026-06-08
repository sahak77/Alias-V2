-- pg_trgm backs the fuzzy Discover index (published_pack_title_trgm_idx) below; create it first (db-architecture.md §9).
CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE TYPE "public"."account_role" AS ENUM('user', 'official', 'admin');--> statement-breakpoint
CREATE TYPE "public"."account_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."content_rating" AS ENUM('standard', 'adult');--> statement-breakpoint
CREATE TYPE "public"."moderation_actor" AS ENUM('auto', 'human');--> statement-breakpoint
CREATE TYPE "public"."moderation_decision" AS ENUM('approved', 'held', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."pack_source" AS ENUM('builtin', 'custom', 'ai');--> statement-breakpoint
CREATE TYPE "public"."publish_status" AS ENUM('pending', 'listed', 'held', 'takenDown');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('ip', 'adult', 'spam', 'quality', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'reviewing', 'actioned', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."text_direction" AS ENUM('ltr', 'rtl');--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text,
	"publisher_key_id" text NOT NULL,
	"nickname" text NOT NULL,
	"avatar_emoji" text,
	"role" "account_role" DEFAULT 'user' NOT NULL,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "account_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "account_publisher_key_id_unique" UNIQUE("publisher_key_id")
);
--> statement-breakpoint
CREATE TABLE "published_pack" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publisher_account_id" uuid,
	"publisher_key_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"cover_emoji" text,
	"locale" text NOT NULL,
	"content_rating" "content_rating" DEFAULT 'standard' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"source" "pack_source" NOT NULL,
	"status" "publish_status" DEFAULT 'pending' NOT NULL,
	"content_hash" text NOT NULL,
	"words_count" integer NOT NULL,
	"r2_key" text NOT NULL,
	"install_count" integer DEFAULT 0 NOT NULL,
	"rating_avg" numeric(2, 1) DEFAULT '0' NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"ai_meta" jsonb,
	"search_vector" "tsvector",
	"schema_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "language" (
	"code" text PRIMARY KEY NOT NULL,
	"endonym" text NOT NULL,
	"display_name" text NOT NULL,
	"flag" text,
	"direction" text_direction DEFAULT 'ltr' NOT NULL,
	"is_launch_locale" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"default_pack_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_policy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locale" text NOT NULL,
	"version" integer NOT NULL,
	"blocklist" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_latest" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_policy_locale_version_uq" UNIQUE("locale","version")
);
--> statement-breakpoint
CREATE TABLE "rating" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"published_pack_id" uuid NOT NULL,
	"rater_device_hash" text NOT NULL,
	"stars" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "rating_pack_device_uq" UNIQUE("published_pack_id","rater_device_hash"),
	CONSTRAINT "rating_stars_chk" CHECK ("rating"."stars" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "install" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"published_pack_id" uuid NOT NULL,
	"install_device_hash" text NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "install_pack_device_uq" UNIQUE("published_pack_id","install_device_hash")
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"published_pack_id" uuid NOT NULL,
	"reason_code" "report_reason" NOT NULL,
	"reporter_device_hash" text NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_pack_device_uq" UNIQUE("published_pack_id","reporter_device_hash")
);
--> statement-breakpoint
CREATE TABLE "moderation_verdict" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"published_pack_id" uuid NOT NULL,
	"verdict" "moderation_decision" NOT NULL,
	"classifier_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ip_flags" text[] DEFAULT '{}'::text[] NOT NULL,
	"decided_by" "moderation_actor" NOT NULL,
	"reviewer_id" uuid,
	"notes" text,
	"content_hash" text NOT NULL,
	"publisher_key_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "published_pack" ADD CONSTRAINT "published_pack_publisher_account_id_account_id_fk" FOREIGN KEY ("publisher_account_id") REFERENCES "public"."account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "language" ADD CONSTRAINT "language_default_pack_id_published_pack_id_fk" FOREIGN KEY ("default_pack_id") REFERENCES "public"."published_pack"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_published_pack_id_published_pack_id_fk" FOREIGN KEY ("published_pack_id") REFERENCES "public"."published_pack"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "install" ADD CONSTRAINT "install_published_pack_id_published_pack_id_fk" FOREIGN KEY ("published_pack_id") REFERENCES "public"."published_pack"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_published_pack_id_published_pack_id_fk" FOREIGN KEY ("published_pack_id") REFERENCES "public"."published_pack"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_verdict" ADD CONSTRAINT "moderation_verdict_published_pack_id_published_pack_id_fk" FOREIGN KEY ("published_pack_id") REFERENCES "public"."published_pack"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_verdict" ADD CONSTRAINT "moderation_verdict_reviewer_id_account_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "published_pack_hash_idx" ON "published_pack" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "published_pack_search_idx" ON "published_pack" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "published_pack_tags_idx" ON "published_pack" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "published_pack_title_trgm_idx" ON "published_pack" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "published_pack_status_locale_idx" ON "published_pack" USING btree ("status","locale");--> statement-breakpoint
CREATE INDEX "published_pack_publisher_idx" ON "published_pack" USING btree ("publisher_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_policy_latest_uq" ON "content_policy" USING btree ("locale") WHERE "content_policy"."is_latest";--> statement-breakpoint
CREATE INDEX "rating_pack_idx" ON "rating" USING btree ("published_pack_id");--> statement-breakpoint
CREATE INDEX "install_pack_idx" ON "install" USING btree ("published_pack_id");--> statement-breakpoint
CREATE INDEX "report_status_idx" ON "report" USING btree ("status");--> statement-breakpoint
CREATE INDEX "moderation_verdict_publisher_idx" ON "moderation_verdict" USING btree ("publisher_key_id");--> statement-breakpoint
CREATE INDEX "moderation_verdict_pack_created_idx" ON "moderation_verdict" USING btree ("published_pack_id","created_at" DESC NULLS LAST);