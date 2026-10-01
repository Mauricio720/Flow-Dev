---
name: trpc-nextjs
description: 'How to design and wire tRPC in a Next.js App Router project. Covers initialization, context, procedure builders and auth middleware, domain routers, Zod inputs, inferred outputs, TRPCError mapping, the type-only AppRouter contract, the /api/trpc Route Handler, the server-side caller for Server Components and Server Actions, and the client for Client Components. Use whenever adding or changing tRPC procedures, routers, middleware, context, or error handling, setting up tRPC in a Next.js app, or consuming a procedure from a page or component, even if the user only says "add an endpoint". Only the tRPC boundary: the layers behind a procedure are covered by layered-backend, and file placement in the app by nextjs-folder-structure.'
---

# tRPC in Next.js

tRPC is a **typed transport boundary**. Its jobs are to authenticate the caller, validate input, dispatch to application code, and carry a typed result back. Everything a procedure knows beyond that (business rules, persistence, external services) belongs behind it, and `layered-backend` covers those layers. Keeping tRPC thin is what keeps the contract readable and the application code testable without HTTP.

## 1. Read the existing setup first

Most projects already have tRPC initialized. Find it and extend it instead of adding a parallel setup:

1. The `initTRPC` call (often `trpc.ts` or `init.ts`): the context type, the `transformer` (superjson or none), and the `errorFormatter`.
2. The procedure builders (`publicProcedure`, `protectedProcedure`, role-specific ones) and what each puts on `ctx`.
3. The root router and how domain routers are merged into it.
4. The Next.js wiring: the Route Handler under `app/api/trpc/[trpc]/route.ts`, the server-side caller, and the client-side client.
5. Guard tests that snapshot registered procedures, router shape, or error contracts. A new procedure usually has to be added to them.
6. Project instructions that fix naming, folders, or limits. They win over the defaults here.

## 2. Keep the server runtime out of the browser

The router's **type** is shared. Its **runtime** is not.

- Export `AppRouter`, plus `RouterInputs`/`RouterOutputs` helpers built with `inferRouterInputs` and `inferRouterOutputs`, from a **type-only** entry. In a monorepo that is the API package root (`index.ts` with only `export type`). In a single app it is a module the client imports with `import type`.
- Expose runtime values (the router, the context factory, the caller) only through a server-only entry: a separate package subpath such as `@scope/api/server`, or a module that imports `server-only`.
- A runtime export on the shared entry can pull DB drivers, secrets, or SDKs with privileged keys into the client bundle. It's also the easiest mistake to miss in review.

## 3. Context and procedure builders

- **Context** is created per request. It resolves identity from the request (a Bearer token or session cookie, verified server-side) plus cheap request metadata (IP, request id). Keep it light: don't open DB transactions or load large data there.
- **Procedure builders** encode authorization once. `protectedProcedure` is a middleware that rejects anonymous calls with `UNAUTHORIZED` and narrows `ctx.user` to non-null. Role builders (`adminProcedure`) layer on top of it. Procedures pick a builder; they don't re-implement auth checks.
- **Identity and ownership come from `ctx`, never from input.** An input field like `userId` for "the current user" is a vulnerability.
- Middleware also suits cross-cutting concerns such as timing, logging, or rate limits, but not business rules.

## 4. Routers and procedures

- One router per domain (`orders`, `profile`, …), merged into the root router. Procedure names are verbs or queries in the domain's language (`list`, `byId`, `cancel`).
- Use `query` for reads without side effects and `mutation` for anything that writes or triggers work.
- A procedure is a builder, `.input(schema)`, and **one** call into application code that passes `ctx` values and `input`:

```ts
export function createOrdersRouter(controller: OrdersController = ordersController) {
  return router({
    byId: protectedProcedure.input(orderByIdInputSchema).query(({ ctx, input }) => controller.byId(ctx.user, input)),
    cancel: protectedProcedure.input(cancelOrderInputSchema).mutation(({ ctx, input }) => controller.cancel(ctx.user, input)),
  });
}
export const ordersRouter = createOrdersRouter();
```

- The factory with a default controller lets tests build the router with a fake and call it through `createCaller`, with no container and no HTTP.
- Don't construct repositories or services, open transactions, or shape output inside the procedure.

## 5. Inputs and outputs

- Input schemas (usually Zod) live in `schemas/<domain>.ts`, not inline in the router, so the frontend and tests can reuse them. They validate shape and bounds, and business rules stay behind the boundary. Derive primitives from DB schemas (drizzle-zod, prisma-zod) when the project does.
- Output types are **inferred from what the handler returns**, so the return value *is* the public contract. Return an explicit DTO with only the fields the client needs, not a raw DB row.
- **Serialization:** without a transformer, `Date`, `Map`, `Set`, and `bigint` don't survive JSON. The client receives strings while the inferred type still says `Date`. Either return ISO strings, or use the same transformer (superjson) on the server and on every link.
- Frontend code uses `RouterInputs['orders']['cancel']` and `RouterOutputs[...]`. Never redeclare API types by hand.

## 6. Errors

Application code throws plain named errors. The boundary (the controller or handler behind the procedure) translates known ones to `TRPCError`:

| Situation | Code |
|---|---|
| No or invalid credentials | `UNAUTHORIZED` |
| Authenticated but not allowed | `FORBIDDEN` |
| Resource missing or not owned by the caller (don't reveal which) | `NOT_FOUND` |
| Input valid in shape but violates a rule | `BAD_REQUEST` or `PRECONDITION_FAILED` |
| Duplicate or concurrent state | `CONFLICT` |
| Rate limit | `TOO_MANY_REQUESTS` |
| Anything unknown | `INTERNAL_SERVER_ERROR` |

- Messages are safe for end users. Put the original error in `cause` for logs, and never put internals in `message`.
- Use `errorFormatter` for cross-cutting shape, such as exposing flattened Zod errors for form fields.
- Code below the boundary never throws `TRPCError`, so it stays reusable from jobs, scripts, and other transports.

## 7. Next.js wiring

Three pieces. Reuse the project's existing ones. [references/nextjs-wiring.md](references/nextjs-wiring.md) has code for each, if you are setting them up from scratch:

1. **Route Handler** at `app/api/trpc/[trpc]/route.ts`, using `fetchRequestHandler` and exported as `GET` and `POST`. It owns transport policy: allowed methods, body-size limit, `Cache-Control: no-store` for authenticated responses, and same-origin/CORS rules.
2. **Server-side caller** for Server Components, Server Actions, and other Route Handlers. It calls the router directly, with no HTTP round-trip, and builds context from `await headers()`. Wrap it in React `cache()` so one render shares one context.
3. **Client-side client** for Client Components: `createTRPCClient` with `httpBatchLink` pointing at the relative `/api/trpc`. Add `@trpc/tanstack-react-query` only when caching, invalidation, or shared mutation state is a real requirement. For a one-off mutation followed by `router.refresh()`, the plain client is enough.

Both clients send only the credential the context expects, such as the `Authorization` header. Never send secrets or service-role keys from the browser.

## 8. Verify

1. Each procedure is a builder, an input, and one call. There's no logic, construction, or error mapping in the router.
2. Identity comes from `ctx`, and the protected builder is used for anything user-scoped.
3. The shared entry is still type-only, and nothing server-only is imported by client modules.
4. Outputs are explicit DTOs and serialize correctly (dates handled).
5. Guard tests and procedure snapshots are updated.
6. Run the typecheck and tests of the API code and of every app that consumes the contract, since a changed output type breaks callers at compile time.
