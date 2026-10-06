import "server-only";
import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@flow-dev/api/server";

const required = ["BETTER_AUTH_URL", "BETTER_AUTH_SECRET", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"] as const;
type Environment = Record<(typeof required)[number], string> & { origin: string };

function environment(): Environment {
  const values = Object.fromEntries(required.map((key) => [key, process.env[key]])) as Partial<Environment>;
  if (Object.values(values).some((value) => !value) || !db) throw new Error("Better Auth requires complete environment and DATABASE_URL");
  const parsed = new URL(values.BETTER_AUTH_URL!);
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("BETTER_AUTH_URL must be an origin");
  }
  return { ...(values as Record<(typeof required)[number], string>), origin: parsed.origin };
}

type GithubProfile = { id: number; login: string; name?: string | null; avatar_url?: string | null };

function mapGithubProfile(profile: GithubProfile) {
  if (!Number.isSafeInteger(profile.id) || profile.id <= 0) throw new Error("GitHub profile id is invalid");
  const login = profile.login?.trim();
  if (!login) throw new Error("GitHub profile login is invalid");
  return { accountId: String(profile.id), login, name: profile.name?.trim() || login, image: profile.avatar_url ?? null };
}

const database = db;
if (!database) throw new Error("Better Auth requires DATABASE_URL");
const config = environment();

export const auth = betterAuth({
  database: drizzleAdapter(database, { provider: "pg" }),
  baseURL: config.origin,
  secret: config.BETTER_AUTH_SECRET,
  trustedOrigins: [config.origin],
  onAPIError: { errorURL: config.origin + "/login" },
  disabledPaths: ["/link-social", "/get-access-token", "/refresh-token", "/account-info", "/sign-up/email", "/sign-in/email"],
  account: { modelName: "accounts", accountLinking: { disableImplicitLinking: true }, encryptOAuthTokens: true },
  user: { modelName: "users" },
  session: { modelName: "sessions", expiresIn: 604800, updateAge: 0, cookieCache: { enabled: false } },
  verification: { modelName: "verification" },
  advanced: { database: { generateId: "uuid" } },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 10,
    customRules: { "/sign-in/social": { window: 60, max: 10 } },
  },
  socialProviders: {
    github: {
      clientId: config.GITHUB_CLIENT_ID,
      clientSecret: config.GITHUB_CLIENT_SECRET,
      disableDefaultScope: true,
      scope: ["read:user"],
      accountSubject: ({ profile }: { profile: GithubProfile }) => profile.id,
      async getUserInfo(tokens: { accessToken?: string }) {
        if (!tokens.accessToken) return null;
        const response = await fetch("https://api.github.com/user", {
          headers: { authorization: "Bearer " + tokens.accessToken, accept: "application/vnd.github+json" },
        });
        if (!response.ok) return null;
        const profile = await response.json();
        const identity = mapGithubProfile(profile);
        return {
          user: { name: identity.login, email: "github-" + identity.accountId + "@flowdev.invalid", image: identity.image ?? undefined, emailVerified: false },
          data: profile,
        };
      },
    },
  },
});

export function validateAuthEnvironment() {
  return config;
}
