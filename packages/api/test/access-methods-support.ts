import { CREDENTIAL_PROVIDER_ID, GITHUB_PROVIDER_ID, GOOGLE_PROVIDER_ID } from "../src/application/auth/providerIds";
import { accounts, users } from "../src/infra/database/schema";
import type { testDatabase } from "./database";

type TestDatabase = Pick<Awaited<ReturnType<typeof testDatabase>>, "database">;
type NewAccount = { userId: string; providerId: string; accountId: string; password?: string };

export async function linkAccount(db: TestDatabase, account: NewAccount) {
  await db.database.insert(accounts).values(account);
}

export async function linkGithub(db: TestDatabase, userId: string, githubId: string) {
  await linkAccount(db, { userId, providerId: GITHUB_PROVIDER_ID, accountId: githubId });
}

export async function linkPassword(db: TestDatabase, userId: string) {
  await linkAccount(db, { userId, providerId: CREDENTIAL_PROVIDER_ID, accountId: userId, password: "hash" });
}

export async function insertGoogleUser(db: TestDatabase, input: { name: string; email: string }) {
  const [user] = await db.database.insert(users).values({ ...input, emailVerified: true }).returning();
  await linkAccount(db, { userId: user.id, providerId: GOOGLE_PROVIDER_ID, accountId: `google-${user.id}` });
  return user;
}

export async function insertGithubUser(db: TestDatabase, input: { login: string; githubId: string }) {
  const [user] = await db.database.insert(users).values({ name: input.login, email: `github-${input.githubId}@flowdev.invalid` }).returning();
  await linkGithub(db, user.id, input.githubId);
  return user;
}
