import "server-only";
import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@flow-dev/api/server";

const required = ["BETTER_AUTH_URL", "BETTER_AUTH_SECRET", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"] as const;
function environment() {
  const values = Object.fromEntries(required.map((key) => [key, process.env[key]]));
  if (Object.values(values).some((value) => !value)) throw new Error("Better Auth environment is incomplete");
  return values as Record<(typeof required)[number], string>;
}

export const auth = betterAuth({
  database: db ? drizzleAdapter(db, { provider: "pg" }) : undefined,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : [],
  disabledPaths: ["/link-social", "/get-access-token", "/refresh-token", "/account-info", "/sign-up/email", "/sign-in/email"],
  account: { modelName: "accounts", accountLinking: { disableImplicitLinking: true }, encryptOAuthTokens: true },
  user: { modelName: "users" },
  session: { modelName: "sessions", expiresIn: 604800, updateAge: 0, cookieCache: { enabled: false } },
  verification: { modelName: "verification" },
  hooks: { before: async (context: { path: string; body?: Record<string, unknown> }) => { if (context.path === "/sign-in/social") { const body = context.body ?? {}; if (body.provider !== "github" || body.scopes !== undefined || body.additionalParams !== undefined) throw new Error("OAuth request is not allowed"); } } },
  socialProviders: { github: { clientId: process.env.GITHUB_CLIENT_ID ?? "", clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "", disableDefaultScope: true, scope: ["read:user"], async getUserInfo(tokens: { accessToken: string }) { const response = await fetch("https://api.github.com/user", { headers: { authorization: `Bearer ${tokens.accessToken}`, accept: "application/vnd.github+json" } }); if (!response.ok) return null; const profile = await response.json() as { id: number; login: string; name?: string; avatar_url?: string }; return { id: String(profile.id), name: profile.name || profile.login, email: `github-${profile.id}@flowdev.invalid`, image: profile.avatar_url }; } } },
} as never);

export function validateAuthEnvironment() { return environment(); }
