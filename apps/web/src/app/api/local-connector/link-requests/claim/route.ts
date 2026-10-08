import { createProductionLocalLinkRequestController, createProductionLocalMachineController } from "@flow-dev/api/server";
import { connectorFailure, connectorJson, guardConnectorRequest, linkRequestClaimInput, parseBoundedJson, rateLimited } from "@/lib/http/localConnector";

export const runtime = "nodejs";
const RATE_LIMIT = 120;
let machineController: ReturnType<typeof createProductionLocalMachineController> | undefined;
let requestController: ReturnType<typeof createProductionLocalLinkRequestController> | undefined;

export async function POST(request: Request) {
  const guarded = guardConnectorRequest(request, "machine");
  if (guarded.response) return guarded.response;
  try {
    const rate = await (machineController ??= createProductionLocalMachineController()).consumeRateLimit(`${guarded.rateKey!}:link-request-claim`, RATE_LIMIT);
    if (!rate.allowed) return rateLimited(rate.retryAfterSeconds);
  } catch (error) { return connectorFailure(error); }
  const parsed = await parseBoundedJson(request, linkRequestClaimInput);
  if ("response" in parsed) return parsed.response;
  try {
    return connectorJson(await (requestController ??= createProductionLocalLinkRequestController()).claim({ ...parsed.input, token: guarded.token! }));
  } catch (error) { return connectorFailure(error); }
}
