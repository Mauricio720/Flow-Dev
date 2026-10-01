# Next.js wiring for tRPC (v11)

Reference setup for projects that don't have tRPC wired yet. Adapt paths to the project, which may use a separate API package or a `server/` folder inside the app. Check the installed Next.js and tRPC versions against their docs before copying. In recent Next.js versions `headers()` is async.

## Initialization: `server/trpc.ts`

```ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const zodError = error.cause instanceof ZodError ? error.cause.flatten() : null;
    return { ...shape, data: { ...shape.data, zodError } };
  },
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
```

Drop `transformer` if the project returns only JSON-safe values. Whatever you choose must match on every link.

## Context: `server/context.ts`

```ts
import { verifyAccessToken } from "./auth/verifyAccessToken";

export async function createContext({ headers }: { headers: Headers }) {
  const token = headers.get("authorization")?.replace(/^Bearer /, "") ?? null;
  const user = token ? await verifyAccessToken(token) : null;
  return { user, requestId: headers.get("x-request-id") };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

## Root router and public types

```ts
// server/routers/index.ts
import { router } from "../trpc";
import { ordersRouter } from "./orders";

export const appRouter = router({ orders: ordersRouter });
export type AppRouter = typeof appRouter;
```

```ts
// type-only entry, e.g. packages/api/src/index.ts or server/types.ts
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "./routers/index";

export type { AppRouter };
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
```

## Route Handler: `app/api/trpc/[trpc]/route.ts`

```ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers";
import { createContext } from "@/server/context";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext({ headers: req.headers }),
    responseMeta: () => ({ headers: { "cache-control": "no-store" } }),
  });
}

export { handler as GET, handler as POST };
```

Add method, body-size, and origin checks here if the project requires them. Keep them in the handler, not in procedures.

## Server-side caller: `lib/trpc/server.ts`

```ts
import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { appRouter } from "@/server/routers";
import { createCallerFactory } from "@/server/trpc";
import { createContext } from "@/server/context";

const createCaller = createCallerFactory(appRouter);

export const getServerCaller = cache(async () => createCaller(await createContext({ headers: await headers() })));
```

Usage in a Server Component or Server Action: `const orders = await (await getServerCaller()).orders.list({})`.

If auth lives in cookies rather than a header, build the context from `cookies()` instead. The point is that the server caller resolves identity the same way the HTTP path does.

## Client-side client: `lib/trpc/client.ts`

```ts
"use client";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/types";
import { getAccessToken } from "@/lib/auth/getAccessToken";

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async headers() {
        const token = await getAccessToken();
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
```

Usage: `await trpc.orders.cancel.mutate({ orderId })`, then `router.refresh()` to re-render server data.

When the app needs query caching, swap in `@trpc/tanstack-react-query` (`createTRPCContext<AppRouter>()` plus a `QueryClientProvider` mounted in a client provider). Keep the same link configuration.

## Testing a procedure without HTTP

```ts
const caller = createCallerFactory(createOrdersRouter(fakeController))({ user: testUser, requestId: null });
await caller.byId({ orderId: "..." });
```
