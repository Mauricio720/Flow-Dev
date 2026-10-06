ALTER TABLE projects
  ADD COLUMN github_repository_id text,
  ADD COLUMN github_node_id text,
  ADD COLUMN repository_owner text,
  ADD COLUMN repository_name text,
  ADD COLUMN repository_visibility text,
  ADD COLUMN repository_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN repository_verified_at timestamptz,
  ADD COLUMN details_version integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE rate_limit ALTER COLUMN last_request DROP DEFAULT;
ALTER TABLE rate_limit ALTER COLUMN last_request TYPE bigint USING (extract(epoch FROM last_request) * 1000)::bigint;
--> statement-breakpoint
CREATE TABLE "github_repository_authorizations" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"github_user_id" text NOT NULL,
	"access_token_ciphertext" text NOT NULL,
	"refresh_token_ciphertext" text,
	"access_expires_at" timestamp with time zone,
	"refresh_expires_at" timestamp with time zone,
	"granted_scopes" text[] NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_repository_oauth_states" (
	"state_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id_hash" text NOT NULL,
	"code_verifier_ciphertext" text NOT NULL,
	"return_to" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_repository_authorizations" ADD CONSTRAINT "github_repository_authorizations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "github_repository_oauth_states" ADD CONSTRAINT "github_repository_oauth_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX github_oauth_states_expiry_idx ON github_repository_oauth_states(expires_at);
CREATE TABLE IF NOT EXISTS "project_repository_backfill" (
  "external_key" text PRIMARY KEY REFERENCES "projects"("external_key") ON DELETE CASCADE,
  "repository_owner" text NOT NULL,
  "repository_name" text NOT NULL,
  "github_repository_id" text NOT NULL,
  "github_node_id" text NOT NULL,
  "repository_visibility" text NOT NULL,
  "repository_archived" boolean NOT NULL DEFAULT false,
  "verified_at" timestamp with time zone NOT NULL
);
