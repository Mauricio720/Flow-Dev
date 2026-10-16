import type { AppRouter } from "@flow-dev/api";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { MAX_TRPC_BATCH_SIZE } from "./batchPolicy";

export const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "/api/trpc", maxItems: MAX_TRPC_BATCH_SIZE })],
});
