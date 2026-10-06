import { appRouter, createContext } from "@flow-dev/api/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { auth } from "@/lib/auth/auth";
import { enforceTrpcRequestPolicy } from "@/lib/http/trpcRequestPolicy";

async function handler(incoming: Request) {
  const policy = await enforceTrpcRequestPolicy(incoming);
  if (policy.response) return policy.response;
  const req = policy.request!;
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => createContext({ headers: req.headers, resolveSession: async (headers) => {
      const result = await auth.api.getSession({ headers, returnHeaders: true });
      return { principal: result.response?.user ? { userId: result.response.user.id, sessionId: result.response.session.id } : null, headers: result.headers };
    } }),
    responseMeta: ({ ctx }) => ({ headers: sessionHeaders(ctx?.responseHeaders) }),
  });
}

export { handler as GET, handler as POST };

function sessionHeaders(source?: Headers) {
  const headers = new Headers({ "cache-control": "no-store" });
  if (!source) return headers;
  const cookies = source.getSetCookie?.() ?? [];
  if (cookies.length) cookies.forEach((cookie) => headers.append("set-cookie", cookie));
  else if (source.get("set-cookie")) headers.set("set-cookie", source.get("set-cookie")!);
  return headers;
}
