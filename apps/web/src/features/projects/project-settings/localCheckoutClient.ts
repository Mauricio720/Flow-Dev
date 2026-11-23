import { TRPC_BAD_REQUEST, TRPC_CONFLICT, TRPC_UNAUTHORIZED, type LocalCheckout } from "@/lib/projects/contract";
import { trpc } from "@/lib/trpc/client";
import { trpcCode } from "@/lib/trpc/error";
import { LOCAL_CHECKOUT_GENERIC_MESSAGE, LOCAL_CHECKOUT_PICK_UNAVAILABLE_MESSAGE, LOCAL_CHECKOUT_REMOVE_FAILED_MESSAGE } from "./localCheckoutCopy";

export type CheckoutOutcome =
  | { kind: "saved"; checkout: LocalCheckout }
  | { kind: "removed" }
  | { kind: "unauthorized" }
  | { kind: "failed"; message: string };

export type PickOutcome = { kind: "picked"; path: string } | { kind: "cancelled" } | { kind: "unauthorized" } | { kind: "failed"; message: string };

type SaveRequest = { projectId: string; path: string; expectedVersion: number };
const SERVER_MESSAGE_CODES = new Set<string>([TRPC_BAD_REQUEST, TRPC_CONFLICT]);

function failure(error: unknown, fallback: string): CheckoutOutcome {
  const code = String(trpcCode(error));
  if (code === TRPC_UNAUTHORIZED) return { kind: "unauthorized" };
  const showServerMessage = error instanceof Error && SERVER_MESSAGE_CODES.has(code);
  return { kind: "failed", message: showServerMessage ? error.message : fallback };
}

export async function requestSave(request: SaveRequest): Promise<CheckoutOutcome> {
  try {
    return { kind: "saved", checkout: await trpc.projects.localCheckout.save.mutate(request) };
  } catch (error) {
    return failure(error, LOCAL_CHECKOUT_GENERIC_MESSAGE);
  }
}

export async function requestRemove(projectId: string): Promise<CheckoutOutcome> {
  try {
    await trpc.projects.localCheckout.remove.mutate({ projectId });
    return { kind: "removed" };
  } catch (error) {
    return failure(error, LOCAL_CHECKOUT_REMOVE_FAILED_MESSAGE);
  }
}

export async function requestPickFolder(projectId: string): Promise<PickOutcome> {
  try {
    const pick = await trpc.projects.localCheckout.pickFolder.mutate({ projectId });
    return pick.kind === "unavailable" ? { kind: "failed", message: LOCAL_CHECKOUT_PICK_UNAVAILABLE_MESSAGE } : pick;
  } catch (error) {
    const outcome = failure(error, LOCAL_CHECKOUT_PICK_UNAVAILABLE_MESSAGE);
    return outcome.kind === "failed" ? outcome : { kind: "unauthorized" };
  }
}
