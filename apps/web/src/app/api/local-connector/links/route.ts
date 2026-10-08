import { createProductionLocalMachineController, createProductionLocalProjectLinkController } from "@flow-dev/api/server";
import { connectorFailure, connectorJson, guardConnectorRequest, linkPublishInput, parseBoundedJson, rateLimited } from "@/lib/http/localConnector";

export const runtime = "nodejs";
let machineController: ReturnType<typeof createProductionLocalMachineController> | undefined;
let linkController: ReturnType<typeof createProductionLocalProjectLinkController> | undefined;

export async function POST(request: Request) {
  const guarded = guardConnectorRequest(request, "machine");
  if (guarded.response) return guarded.response;
  try {
    const rate = await (machineController ??= createProductionLocalMachineController()).consumeRateLimit(guarded.rateKey!, 120);
    if (!rate.allowed) return rateLimited(rate.retryAfterSeconds);
  } catch (error) { return connectorFailure(error); }
  const parsed = await parseBoundedJson(request, linkPublishInput);
  if ("response" in parsed) return parsed.response;
  try {
    const result = await (linkController ??= createProductionLocalProjectLinkController()).publish({ ...parsed.input, token: guarded.token! });
    return connectorJson(result);
  } catch (error) { return connectorFailure(error); }
}
