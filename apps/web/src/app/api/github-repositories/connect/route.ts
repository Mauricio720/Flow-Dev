import { createProductionRepositoryOAuthController } from "@flow-dev/api/server";
import { auth } from "@/lib/auth/auth";

export async function POST(request: Request) {
  const session = await sessionFor(request);
  if (!session) return Response.json({ message: "Sessão necessária" }, { status: 401 });
  try {
    const url = new URL(request.url);
    const target = await createProductionRepositoryOAuthController().connect(session, url.searchParams.get("returnTo"), request.headers.get("origin"));
    return Response.redirect(target, 303);
  } catch (error) {
    const status = error instanceof Error && error.message === "Invalid request origin" ? 403 : 400;
    return Response.json({ message: "Não foi possível iniciar a autorização" }, { status });
  }
}

async function sessionFor(request: Request) {
  const result = await auth.api.getSession({ headers: request.headers }) as { user?: { id: string }; session?: { id: string } } | null;
  return result?.user?.id && result.session?.id ? { userId: result.user.id, sessionId: result.session.id } : null;
}
