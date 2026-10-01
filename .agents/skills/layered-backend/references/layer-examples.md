# Layer examples

A compact end-to-end slice for an `orders` domain: a simple read (controller → DAO) and an operation with rules (controller → service → DAO). The entrypoint here is tRPC, and a REST equivalent is shown after it. Names, file case, the ORM, and the DB runner are illustrative. Mirror the project's real ones.

## Input schema: `schemas/orders.ts`

```ts
import { z } from "zod";

export const orderByIdInputSchema = z.object({ orderId: z.string().uuid() });
export const cancelOrderInputSchema = z.object({ orderId: z.string().uuid(), reason: z.string().max(280).optional() });
export type CancelOrderInput = z.infer<typeof cancelOrderInputSchema>;
```

## Entrypoint (tRPC): `routers/orders.ts`

```ts
import { ordersController, type OrdersController } from "../controllers/ordersController.js";
import { cancelOrderInputSchema, orderByIdInputSchema } from "../schemas/orders.js";
import { protectedProcedure, router } from "../trpc.js";

export function createOrdersRouter(controller: OrdersController = ordersController) {
  return router({
    byId: protectedProcedure.input(orderByIdInputSchema).query(({ ctx, input }) => controller.byId(ctx.user, input)),
    cancel: protectedProcedure.input(cancelOrderInputSchema).mutation(({ ctx, input }) => controller.cancel(ctx.user, input)),
  });
}

export const ordersRouter = createOrdersRouter();
```

### Same controller behind a REST Route Handler: `app/api/orders/[orderId]/cancel/route.ts`

```ts
import { ordersController } from "@/server/controllers/ordersController";
import { requireUser } from "@/server/auth/requireUser";
import { cancelOrderInputSchema } from "@/server/schemas/orders";

export async function POST(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const user = await requireUser(req);
  const input = cancelOrderInputSchema.parse({ ...(await req.json()), orderId: (await params).orderId });
  return Response.json(await ordersController.cancel(user, input));
}
```

The controller is identical. Only the error translation changes: map application errors to HTTP statuses instead of `TRPCError`, ideally through one small mapper per transport.

## DAO contract: `application/database/dao/orderDao.ts`

```ts
export type OrderRecord = { id: string; ownerId: string; status: string; createdAt: Date };

export interface OrderDao {
  findOwned(ownerId: string, orderId: string): Promise<OrderRecord | null>;
  markCancelled(orderId: string, reason: string | null): Promise<void>;
}
```

## DAO implementation: `infra/database/dao/orders/drizzleOrderDao.ts`

```ts
import { and, eq } from "drizzle-orm";
import { orders, type DatabaseTransaction } from "@scope/db";
import type { OrderDao } from "../../../../application/database/dao/orderDao.js";

export class DrizzleOrderDao implements OrderDao {
  constructor(private readonly tx: DatabaseTransaction) {}

  async findOwned(ownerId: string, orderId: string) {
    const [row] = await this.tx.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.ownerId, ownerId))).limit(1);
    return row ?? null;
  }

  async markCancelled(orderId: string, reason: string | null) {
    await this.tx.update(orders).set({ status: "cancelled", cancelReason: reason }).where(eq(orders.id, orderId));
  }
}
```

The owner predicate sits in the DAO query even if row-level security exists.

## Contextual service: `application/services/orders/orderLifecycleService.ts`

```ts
import type { OrderDao } from "../../database/dao/orderDao.js";
import type { Clock } from "../../date/clock.js";

export class OrderNotFoundError extends Error {}
export class OrderNotCancellableError extends Error {}

const CANCELLABLE_STATUS = "pending";
const CANCELLATION_WINDOW_MS = 30 * 60 * 1000;

export class OrderLifecycleService {
  constructor(private readonly orders: OrderDao, private readonly clock: Clock) {}

  async cancel(ownerId: string, orderId: string, reason: string | null) {
    const order = await this.orders.findOwned(ownerId, orderId);
    if (!order) throw new OrderNotFoundError();
    if (!this.isCancellable(order.status, order.createdAt)) throw new OrderNotCancellableError();
    await this.orders.markCancelled(order.id, reason);
  }

  private isCancellable(status: string, createdAt: Date) {
    return status === CANCELLABLE_STATUS && this.clock.now().getTime() - createdAt.getTime() <= CANCELLATION_WINDOW_MS;
  }
}
```

No transport imports, no request context. The service is named after its context (order lifecycle), so `refund` or `reschedule` become new methods here, not new classes. It is testable with a fake DAO and clock.

## Controller: `controllers/ordersController.ts`

```ts
import { TRPCError } from "@trpc/server";
import type { DatabaseTransaction } from "@scope/db";
import type { AuthenticatedUser } from "../application/auth/accessTokenVerifier.js";
import type { AuthenticatedDatabase } from "../application/database/authenticatedDatabase.js";
import type { OrderDao } from "../application/database/dao/orderDao.js";
import type { Clock } from "../application/date/clock.js";
import { OrderLifecycleService, OrderNotCancellableError, OrderNotFoundError } from "../application/services/orders/orderLifecycleService.js";
import { DrizzleOrderDao } from "../infra/database/dao/orders/drizzleOrderDao.js";
import { authenticatedDatabase } from "../infra/database/authenticatedDatabase.js";
import { SystemClock } from "../infra/date/systemClock.js";
import type { CancelOrderInput } from "../schemas/orders.js";
import { mapOrderDto } from "./mappers/orderDtoMapper.js";

type OrderDaoFactory = (tx: DatabaseTransaction) => OrderDao;

export class OrdersController {
  constructor(private readonly database: AuthenticatedDatabase, private readonly clock: Clock, private readonly createDao: OrderDaoFactory = (tx) => new DrizzleOrderDao(tx)) {}

  async byId(user: AuthenticatedUser, input: { orderId: string }) {
    const order = await this.database.run(user, (tx) => this.createDao(tx).findOwned(user.id, input.orderId));
    if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
    return mapOrderDto(order);
  }

  async cancel(user: AuthenticatedUser, input: CancelOrderInput) {
    try {
      await this.database.run(user, (tx) => new OrderLifecycleService(this.createDao(tx), this.clock).cancel(user.id, input.orderId, input.reason ?? null));
      return { success: true } as const;
    } catch (error) {
      throw mapCancelError(error);
    }
  }
}

function mapCancelError(error: unknown) {
  if (error instanceof OrderNotFoundError) return new TRPCError({ code: "NOT_FOUND", message: "Order not found.", cause: error });
  if (error instanceof OrderNotCancellableError) return new TRPCError({ code: "PRECONDITION_FAILED", message: "This order can no longer be cancelled.", cause: error });
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not cancel the order.", cause: error });
}

export const ordersController = new OrdersController(authenticatedDatabase, new SystemClock());
```

Things to notice:

- `byId` is a plain read, so the controller calls the DAO directly and adds no service.
- `cancel` has rules, so the controller opens the scope, builds the transaction-scoped DAO, and hands it to the service.
- The controller is the only layer that knows about transport errors (`TRPCError` here) and DTOs.
- The entrypoint never sees `DrizzleOrderDao`, `SystemClock`, or the database runner.

