export type SessionPrincipal = { userId: string; sessionId?: string };
export class SessionRequiredError extends Error {}
export type SessionResolution = SessionPrincipal | null | { principal: SessionPrincipal | null; headers?: Headers };
export type SessionResolver = (headers: Headers) => Promise<SessionResolution>;
const defaultResolver: SessionResolver = async () => null;
export function requireSession(session: SessionPrincipal | null | undefined) { if (!session?.userId) throw new SessionRequiredError(); return { userId: session.userId }; }

export async function createContext({ headers, resolveSession = defaultResolver }: { headers: Headers; resolveSession?: SessionResolver }) {
  const result = await resolveSession(headers);
  const resolution = result && "principal" in result ? result : { principal: result };
  return { requestId: headers.get("x-request-id") ?? crypto.randomUUID(), principal: resolution.principal, responseHeaders: resolution.headers };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
