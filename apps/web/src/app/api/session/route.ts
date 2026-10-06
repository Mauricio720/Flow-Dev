import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";

export async function GET() {
  const result = await auth.api.getSession({ headers: await headers(), returnHeaders: true });
  const response = Response.json(result.response, { headers: { "cache-control": "no-store" } });
  const cookies = result.headers.getSetCookie?.() ?? [];
  cookies.forEach((cookie) => response.headers.append("set-cookie", cookie));
  return response;
}
