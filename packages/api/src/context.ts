export type SessionPrincipal = { userId: string };
export class SessionRequiredError extends Error {}
export type SessionResolver = (headers: Headers) => Promise<SessionPrincipal | null>;
const defaultResolver: SessionResolver = async () => null;
export function requireSession(session: SessionPrincipal | null | undefined) { if (!session?.userId) throw new SessionRequiredError(); return { userId: session.userId }; }

export async function createContext({ headers, resolveSession = defaultResolver }: { headers: Headers; resolveSession?: SessionResolver }) {
  return { requestId: headers.get("x-request-id") ?? crypto.randomUUID(), principal: await resolveSession(headers) };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
