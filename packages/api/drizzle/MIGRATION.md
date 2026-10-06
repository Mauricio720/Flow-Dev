# Migrating existing project catalogs

The original `0000_catalog.sql` and `0001_auth_access.sql` migrations remain part of the migration history. Repository identity is added in stages so existing project, user, assignment, and session rows stay intact.

1. Set `DATABASE_URL`, GitHub OAuth credentials, and `GITHUB_REPOSITORY_TOKEN_KEY`. Run `pnpm --dir packages/api db:prepare`. This applies the legacy migrations and nullable repository expansion, then stops before enforcing repository identity.
2. Provision a Flow Dev administrator, complete that administrator's personal GitHub repository authorization, and prepare a manifest with one `externalKey` and owner/name reference for every retained project. Repository IDs and node IDs in the manifest are hints only; the command resolves each node through GitHub and rejects any numeric ID mismatch.
3. Run `pnpm --dir packages/api catalog:import -- --file <manifest.json> --user-id <admin-uuid> --backfill`. This replaces the staging set only after every repository has been verified.
4. Run `pnpm --dir packages/api db:migrate`. The final migration checks complete coverage, copies verified identities, and applies `NOT NULL`, uniqueness, validation, and immutable identity rules in one transaction. Any missing mapping leaves the projects table unchanged; fix the manifest and repeat steps 3–4.

Use `catalog:import` without `--backfill` only to import verified projects during normal operation. Never fill the staging table with IDs copied from an unverified source.
