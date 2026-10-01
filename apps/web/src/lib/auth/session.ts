import "server-only";
import { headers } from "next/headers";
import { auth } from "./auth";

export type AuthSession = { user: { id: string; name?: string | null; image?: string | null } };
export async function getAuthSession() {
  try { return await auth.api.getSession({ headers: await headers() }) as AuthSession | null; } catch { return null; }
}
