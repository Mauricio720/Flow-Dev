DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "projects" p LEFT JOIN "project_repository_backfill" b ON b.external_key = p.external_key WHERE b.external_key IS NULL) THEN
    RAISE EXCEPTION 'Every retained project needs a verified repository mapping';
  END IF;
END $$;
UPDATE "projects" p SET github_repository_id = b.github_repository_id, github_node_id = b.github_node_id, repository_owner = b.repository_owner, repository_name = b.repository_name, repository_visibility = b.repository_visibility, repository_archived = b.repository_archived, repository_verified_at = b.verified_at FROM "project_repository_backfill" b WHERE b.external_key = p.external_key;
ALTER TABLE "projects" ALTER COLUMN "github_repository_id" SET NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "github_node_id" SET NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "repository_owner" SET NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "repository_name" SET NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "repository_visibility" SET NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "repository_verified_at" SET NOT NULL;
ALTER TABLE "projects" ADD CONSTRAINT "projects_repository_visibility_check" CHECK (repository_visibility IN ('public', 'private', 'internal'));
ALTER TABLE "projects" ADD CONSTRAINT "projects_name_length_check" CHECK (char_length(btrim(name)) BETWEEN 2 AND 60);
ALTER TABLE "projects" ADD CONSTRAINT "projects_description_length_check" CHECK (description IS NULL OR char_length(btrim(description)) <= 280);
ALTER TABLE projects ADD CONSTRAINT projects_github_repository_id_unique UNIQUE (github_repository_id);
ALTER TABLE projects ADD CONSTRAINT projects_github_node_id_unique UNIQUE (github_node_id);
CREATE INDEX projects_created_id_idx ON projects(created_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS "projects_name_lower_unique" ON "projects" (lower(name));
CREATE OR REPLACE FUNCTION protect_project_repository_identity() RETURNS trigger AS $$
BEGIN
  IF NEW.github_repository_id IS DISTINCT FROM OLD.github_repository_id THEN RAISE EXCEPTION 'github repository identity is immutable'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS projects_repository_identity_trigger ON "projects";
CREATE TRIGGER projects_repository_identity_trigger BEFORE UPDATE ON "projects" FOR EACH ROW EXECUTE FUNCTION protect_project_repository_identity();

