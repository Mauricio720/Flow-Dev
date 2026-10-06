import { auth } from "@/lib/auth/auth";
export const GET = auth.handler;
export async function POST(request: Request) {
  if (new URL(request.url).pathname.endsWith("/sign-in/social")) {
    const body = await request.clone().json().catch(() => null) as Record<string, unknown> | null;
    if (body?.provider !== "github" || body.scopes !== undefined || body.additionalParams !== undefined) {
      return Response.json({ message: "OAuth request is not allowed" }, { status: 400 });
    }
  }
  return auth.handler(request);
}
