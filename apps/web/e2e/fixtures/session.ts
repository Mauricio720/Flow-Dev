import { createHmac } from "node:crypto";
import type { BrowserContext } from "@playwright/test";
import { e2eAuthSecret } from "./environment";

const SESSION_COOKIE = "better-auth.session_token";

function signedSessionValue(token: string) {
  const signature = createHmac("sha256", e2eAuthSecret ?? "").update(token).digest("base64");
  return encodeURIComponent(`${token}.${signature}`);
}

export async function signIn(context: BrowserContext, sessionToken: string, baseURL: string) {
  await context.addCookies([{ name: SESSION_COOKIE, value: signedSessionValue(sessionToken), url: baseURL, httpOnly: true, sameSite: "Lax" }]);
}
