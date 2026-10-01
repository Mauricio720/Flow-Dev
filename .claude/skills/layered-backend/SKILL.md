---
name: layered-backend
description: 'Backend layering for TypeScript services. A thin entrypoint (tRPC procedure, REST handler, Server Action, job) calls a class-based controller, which uses DAOs directly for simple reads or a contextual service for rules. Contracts live in application/, implementations in infra/. Covers dependency composition, transaction scope, error translation, DTO mapping, and keeping abstraction proportional. Use whenever adding or changing backend operations, controllers, services, DAOs or repositories, integrations with external providers, or deciding where backend logic belongs, even if the user just says "create an endpoint" or "add this rule". Transport-agnostic: tRPC specifics are in trpc-nextjs, frontend placement in nextjs-folder-structure.'
---

# Layered Backend

Each layer changes for a different reason: transport, orchestration, business rules, persistence, external systems. Separate those reasons and nothing more. The structure stays deliberately shallow: no domain layer, use-case package, or DI container. The aim is that any operation reads top-down in three or four files, and that rules can be tested without a database or HTTP.

## 1. Read the project first

1. Read project instructions (`AGENTS.md`, `CLAUDE.md`, rules). They may fix folder names, file case, size limits, ORM, and verification commands, and they win over the defaults here.
2. Trace one existing operation end to end, from entrypoint to controller to DAO or service to infra. Copy its shape, not just its folders.
3. Identify how a request-scoped transaction or authenticated DB session is opened, and whether that runner wraps errors thrown inside it.
4. Identify which package owns DB schemas and migrations. Persistence changes go there, never into the API layer.
5. Look for guard tests that pin registered operations, shapes, or error contracts.

## 2. The layers

```text
entrypoint (tRPC procedure | REST handler | Server Action | job)
  │   auth + input validation + ONE controller call
  ▼
controller ──► DAO                        simple read / single write
  │
  └──► contextual service ──► DAO(s)     rules, multi-step work, several dependencies
                  │
                  ▼
        application/ contracts   ◄── implemented by ──   infra/ (ORM, HTTP clients, providers)
```

| Layer | Typical location | Owns | Must not |
|---|---|---|---|
| Entrypoint | `routers/`, `app/api/**/route.ts`, `actions/` | Auth guard, input schema, one controller call with identity from the request context. | Build dependencies, open transactions, map errors, shape output. |
| Controller | `controllers/<domain>Controller.ts` | Orchestration, the transaction scope, composing concrete DAOs and services, translating known errors to transport errors, mapping results to DTOs, observability. | Hold rules that belong in a service, or write queries. |
| Contextual service | `application/services/<domain>/` | Business rules and multi-step work needing a transaction or several dependencies. One service per context, with several methods. | Know the transport, throw transport errors, or read the request context. |
| DAO / repository contract | `application/database/dao/` | An interface for the persistence the application needs. | Leak ORM types to callers when avoidable. |
| DAO implementation | `infra/database/dao/<domain>/` | ORM queries, with an explicit owner predicate on user-scoped data. | Return transport errors or DTOs. |
| Other contracts and infra | `application/<concern>/` ↔ `infra/<concern>/` | Payment gateway, mailer, clock, storage: a contract plus its concrete implementation. | Be imported by entrypoints. |

**DAO or service?** A plain read or single-table write goes from the controller straight to the DAO. Introduce or extend a contextual service only when the operation has rules, spans a transaction, or needs more than one dependency. Don't create one service per operation (`PauseSubscriptionService`, `ResumeSubscriptionService`). Add a method to the context's service (`SubscriptionLifecycleService.pause`) and keep pure rule functions in a sibling `<context>Rules.ts`.

**Keep abstraction proportional.** A contract in `application/` is worth it for real external systems (database, payment provider, mailer) and for the clock when rules depend on time. A one-line stdlib call, like generating a random token, doesn't need an interface plus an infra class. A private helper or a constructor parameter with a default is enough. Avoid generic buckets like `application/ports/` and `infra/adapters/`. Contracts sit beside their concern, and implementations mirror that path.

## 3. Composition and request scope

- Construct stateless shared dependencies (clock, gateways, logger, DB runner) in the controller module, pass them to the controller constructor, and export both the class and a ready instance. Tests build the class with fakes, and entrypoints use the instance.
- Pass request-scoped values (identity, request metadata) from the entrypoint into controller methods as arguments. Controllers don't read globals or request objects.
- The controller opens the transaction and builds transaction-scoped DAOs inside it, usually through a small factory (`(tx) => new DrizzleOrderDao(tx)`). It hands them to the service for that call.
- Identity and ownership come from the authenticated context, never from input. User-scoped queries filter by owner even when row-level security also applies. It costs one `where` clause.

## 4. Errors and output

- Services and DAOs throw plain named errors (`OrderNotCancellableError`), grouped in `application/errors/<domain>Errors.ts` or beside the service.
- The controller maps each known error to the transport's error type (for example `TRPCError` codes or HTTP statuses) with a safe message and the original as `cause`. Unknown errors become a generic internal error without leaking details.
- Check whether the transaction runner wraps errors thrown inside it, a common way to hide driver details. If it does, your new named errors must pass through it, for example via its allow-list. Otherwise every rule violation reaches the client as a generic 500.
- The controller maps rows or service results to an outward DTO with only the needed fields, and dates as ISO strings unless the transport serializes them.
- When a controller grows, move helpers into `controllers/mappers/`, `controllers/dto/`, and `controllers/observability/` rather than letting one file sprawl.

## 5. Persistence changes

Schema changes, migrations, seeds, and access policies belong to whichever package owns the database, generated with the project's migration tool. The backend layer only consumes the updated schema through its ORM. If a rule needs history (for example "not paused in the last 90 days"), prefer an append-only history table over overwriting columns that other flows, such as webhooks, also write.

## 6. Verify

1. The entrypoint has only auth, input, and one controller call.
2. Nothing is constructed in entrypoints, and no transport error is thrown below the controller.
3. User-scoped queries filter by the authenticated owner.
4. New named errors survive the transaction runner and map to the right transport error.
5. Abstractions are proportional: no one-procedure services, no interfaces around trivial calls.
6. Run the backend's typecheck and tests, the DB package's checks if the schema changed, and the consumers' typecheck if an output contract changed. Take the real commands from `package.json` or project instructions.

For a compact end-to-end example (schema → entrypoint → controller → service → DAO contract → ORM implementation), read [references/layer-examples.md](references/layer-examples.md).
