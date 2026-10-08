import { trpcCode, trpcData } from "@/lib/trpc/error";
import { FAILURE_COPY, GENERIC_FAILURE } from "./unifiedCopy";

export type FlowFailure = { code: string | undefined; reason: string | undefined; message: string };

export function describeFailure(error: unknown): FlowFailure {
  const reason = (trpcData(error) as { reason?: string } | undefined)?.reason;
  return { code: trpcCode(error) as string | undefined, reason, message: FAILURE_COPY[reason ?? ""] ?? GENERIC_FAILURE };
}
