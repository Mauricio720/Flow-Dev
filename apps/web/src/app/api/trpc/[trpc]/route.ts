import { appRouter, createContext } from "@flow-dev/api/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { auth } from "@/lib/auth/auth";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => createContext({ headers: req.headers, resolveSession: async (headers) => { const session = await auth.api.getSession({ headers }) as { user?: { id: string } } | null; return session?.user ? { userId: session.user.id } : null; } }),
    responseMeta: () => ({ headers: { "cache-control": "no-store" } }),
  });
}

export { handler as GET, handler as POST };
