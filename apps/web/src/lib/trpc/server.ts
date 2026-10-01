import "server-only";
import { appRouter, createCallerFactory, createContext } from "@flow-dev/api/server";
import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "@/lib/auth/auth";

const createCaller = createCallerFactory(appRouter);

export const getServerCaller = cache(async () => { const requestHeaders = await headers(); return createCaller(await createContext({ headers: requestHeaders, resolveSession: async (value) => { const session = await auth.api.getSession({ headers: value }) as { user?: { id: string } } | null; return session?.user ? { userId: session.user.id } : null; } })); });
