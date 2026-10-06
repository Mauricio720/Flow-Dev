import { createProductionRepositoryOAuthController } from "@flow-dev/api/server";
import { oauthFailure } from "@flow-dev/api/server";
import { auth } from "@/lib/auth/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const session = await sessionFor(request);
  if (!session) return redirect("/projects?connection=falha_autorizacao");
  const state = url.searchParams.get("state");
  if (!state) return redirect("/projects?connection=falha_autorizacao");
  const controller = createProductionRepositoryOAuthController();
  try {
    if (url.searchParams.get("error")) { const target = await controller.cancel(session, state); return redirect(`${target}?connection=acesso_negado`); }
    const code = url.searchParams.get("code");
    if (!code) return redirect("/projects?connection=falha_autorizacao");
    const target = await controller.callback(session, state, code);
    return redirect(`${target}?connection=connected`);
  } catch (error) { return redirect(`/projects?connection=${oauthFailure(error)}`); }
}

function redirect(path: string) { return Response.redirect(new URL(path, process.env.BETTER_AUTH_URL ?? "http://localhost:3000"), 303); }
async function sessionFor(request: Request) { const result = await auth.api.getSession({ headers: request.headers }) as { user?: { id: string }; session?: { id: string } } | null; return result?.user?.id && result.session?.id ? { userId: result.user.id, sessionId: result.session.id } : null; }
