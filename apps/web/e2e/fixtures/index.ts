import { test as base, type Page } from "@playwright/test";
import postgres, { type Sql } from "postgres";
import { E2E_SKIP_REASON, e2eConfigured, e2eDatabaseUrl } from "./environment";
import { ProjectSeed, type SeededUser } from "./seed";
import { WorkSeed } from "./workSeed";
import { signIn } from "./session";

type ProjectFixtures = { seed: ProjectSeed; workSeed: WorkSeed; db: Sql; signInAs: (page: Page, user: SeededUser) => Promise<void> };

export const test = base.extend<ProjectFixtures>({
  seed: async ({}, provide) => {
    base.skip(!e2eConfigured, E2E_SKIP_REASON);
    const sql = postgres(e2eDatabaseUrl ?? "", { max: 1 });
    const seed = new ProjectSeed(sql);
    await provide(seed);
    await seed.cleanup();
    await sql.end();
  },
  workSeed: async ({}, provide) => {
    base.skip(!e2eConfigured, E2E_SKIP_REASON);
    const sql = postgres(e2eDatabaseUrl ?? "", { max: 1 });
    const work = new WorkSeed(sql);
    await provide(work);
    await work.cleanup();
    await sql.end();
  },
  db: async ({}, provide) => {
    base.skip(!e2eConfigured, E2E_SKIP_REASON);
    const sql = postgres(e2eDatabaseUrl ?? "", { max: 1 });
    await provide(sql);
    await sql.end();
  },
  signInAs: async ({ baseURL }, provide) => {
    await provide((page, user) => signIn(page.context(), user.sessionToken, baseURL ?? ""));
  },
});

export { expect } from "@playwright/test";
