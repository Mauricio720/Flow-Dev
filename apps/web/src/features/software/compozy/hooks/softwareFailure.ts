import { trpcCode, trpcData } from "@/lib/trpc/error";

export type SoftwareFailure = { code: string | undefined; reason: string | undefined; fieldErrors: Record<string, string> };

export function readFailure(error: unknown): SoftwareFailure {
  const data = trpcData(error) as { reason?: string; fieldErrors?: Record<string, string> } | undefined;
  return { code: String(trpcCode(error) ?? "") || undefined, reason: data?.reason, fieldErrors: data?.fieldErrors ?? {} };
}
