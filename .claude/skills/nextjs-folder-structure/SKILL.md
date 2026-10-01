---
name: nextjs-folder-structure
description: 'Folder structure and file ownership for Next.js App Router frontends. Covers where pages, layouts, components, hooks, providers, schemas, and helpers belong; thin route entries; feature-first modules; when to promote code to a shared folder; one-way dependency direction; and where "use client" boundaries go. Use whenever creating, moving, or reviewing frontend files in a Next.js app, when the question is "where should this go?" or "should this be shared?", and for frontend folder refactors, even if the user only asks for one new screen. Only placement and boundaries: for tRPC wiring use trpc-nextjs, for backend layering use layered-backend.'
---

# Next.js Folder Structure

One idea drives everything here: **put each file at the narrowest boundary that owns it, and let real reuse, not anticipation, promote it outward.** The payoff is a frontend where route mechanics, product behavior, reusable UI, and infrastructure are each easy to find, and where a new screen doesn't require a repository-wide migration.

## 1. Read the project first

Conventions vary, so the repository is the source of truth and this skill supplies the reasoning.

1. Read project instructions (`AGENTS.md`, `CLAUDE.md`, rules folders). Anything they fix (folder names, size limits, naming) wins over the defaults here.
2. In a monorepo, decide which app owns the change, and check whether a shared UI package exists.
3. Read `tsconfig.json` `paths` for the real import alias (`@/*`, `~/*`, none). Never invent one.
4. Locate the affected route and its nearest `layout`, `loading`, `error`, and `not-found`.
5. Find a similar page, component, or hook and read its imports. Imports reveal ownership boundaries faster than any document.
6. Look for architecture guard tests or lint rules (`structure`/`boundaries` tests, `eslint-plugin-boundaries`, `no-restricted-imports`). They encode the real rules, and some require new features to be registered.
7. Check how the app protects private routes (route groups, middleware/proxy path lists, layout checks). A new private page may need to be registered, or it will be public.

Preserve unrelated code. Don't migrate existing patterns unless the task asks.

## 2. Choose the owner

Walk the table top to bottom and stop at the first row that fits. Paths assume `src/`; adapt to what exists.

| Destination | Owns |
|---|---|
| `app/<route>/` entries | Next.js contracts only: `page`, `layout`, `loading`, `error`, `not-found`, `route`, metadata. |
| Route-local files beside them | A small component, action, or loader used by exactly one route, where a feature folder would be ceremony. |
| `features/<area>/<feature>/` | A business flow with several cooperating pieces, its own behavior, or use from more than one route. |
| `components/ui/` | Visual primitives with no product rules (button, input, dialog shell). |
| `components/<domain>/` | Components shared by several features of one product domain (e.g. an order status badge used by order history and order detail). |
| `components/shared/` | Composed components reused across unrelated domains. |
| Shared UI package (monorepo) | Components or tokens that more than one app actually consumes. |
| `hooks/` | Reusable hooks independent of a single feature. Feature hooks stay in the feature. |
| `providers/` | Client state that truly spans distant branches of the tree. Local state is the default. |
| `lib/` (`lib/<domain>/` when grouped) | Framework integration, data clients, parsing, formatting, infrastructure. |
| `types/` | Frontend-only types shared across domains. Local types live beside their consumer; API types are inferred from the backend contract. |
| `public/` | Static assets served by URL. Imported assets stay near their owner. |

Don't create empty folders for future work. The tree should record real ownership, which is what keeps it navigable.

For tricky calls (tiny route-only component, flow outgrowing its route, component promoted across features or apps, formatters, refactor mixed with a feature), read [references/placement-examples.md](references/placement-examples.md).

## 3. Keep routes thin

A route entry decodes params and search params, loads route-level data, declares metadata, and composes a feature. When forms, tables, dialogs, or business view state show up, move them into a feature. Route files are where Next.js conventions accumulate (streaming, caching, metadata), and mixing product logic in makes both harder to change.

A multi-file feature, with only the folders it needs:

```text
features/<area>/<feature>/
├── index.tsx        public entry: the smallest surface the route needs
├── components/
├── actions/         Server Actions owned by the feature
├── hooks/
├── schemas/
└── types.ts
```

Treat `index.tsx` as a deliberate public API, not an `export *` barrel. Wildcard barrels leak internals and hide who depends on what.

Simple route-owned code can stay colocated (`app/<route>/page.tsx`, `actions.ts`, `RouteOnlyThing.tsx`). Extract it when it gains cooperating components, domain behavior, or a second consumer.

## 4. Keep dependencies pointing one way

```text
app route -> feature -> components/<domain|shared|ui>, hooks -> lib
```

- `app/` depends on features and shared modules, never the reverse.
- Sibling features don't import each other, not even through relative `../../other-feature` paths. When two features need the same thing, promote it to the narrowest shared owner. Cross-feature imports quietly merge features into one tangled module.
- Shared components carry no feature rules. Pass behavior in through props.
- Server-only code (DB access, secrets, privileged SDKs) never lives in client-reachable modules. If the project has a separate backend package, don't move its implementation into the app.
- Prefer the configured alias over long relative paths.

## 5. Place client boundaries deliberately

Default to Server Components. Put `"use client"` on the smallest subtree that needs event handlers, browser APIs, client state, or client-only hooks. A page with one interactive button should usually be a Server Component that renders a small client child, because every client boundary ships its whole import graph to the browser.

- Use the project's existing data clients: a server-side one for Server Components, Server Actions, and Route Handlers, and a client-side one for Client Components. Don't create parallel clients. If the project uses tRPC, `trpc-nextjs` covers the wiring.
- Infer API types from the backend contract. Hand-copied types drift silently.
- Add a client cache library only when caching, invalidation, retries, or shared mutation state is a concrete need.
- Never expose secrets or server-only env vars to the browser. Identity comes from the server session, not client input.

## 6. Naming

- Kebab-case for new route and feature directories.
- Follow the nearest convention for component filenames. Component symbols are PascalCase.
- Name features by product capability (`checkout`, `order-history`), not by technical type.
- Fix spelling in new names, but don't rename legacy paths in passing. Rename churn hides the real change in review.

## 7. Refactor incrementally

When a task touches existing structure, sort findings into:

1. misplaced code that blocks the requested change;
2. safe local improvements inside the task's scope;
3. historical debt to leave alone for now.

Move only 1 and 2. Update imports in the same change, preserve behavior, and don't mix a feature with a repository-wide folder migration. List 3 in the handoff so it isn't lost.

## 8. Verify

1. Each new file has one clear owner, and no sibling-feature import was introduced.
2. Route entries only route and compose.
3. Client boundaries are minimal.
4. Guard tests and registries (feature lists, private-route lists) were updated where required.
5. Run the project's lint, typecheck, and relevant tests (take the commands from `package.json` or project instructions, scoped to the affected package in a monorepo). Run end-to-end tests for user-visible flows, auth, or navigation if the project has them.

In the handoff, summarize the ownership decisions and why, list files created or moved, name the debt left alone, and report the verification evidence.
