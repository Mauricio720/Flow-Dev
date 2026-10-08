import { createProductionLocalMachineController } from "@flow-dev/api/server";
import { connectorFailure, connectorJson, guardConnectorRequest, heartbeatInput, parseBoundedJson, rateLimited } from "@/lib/http/localConnector";

export const runtime = "nodejs";
let controller: ReturnType<typeof createProductionLocalMachineController> | undefined;

export async function POST(request: Request) {
  const guarded = guardConnectorRequest(request, "machine");
  if (guarded.response) return guarded.response;
  try {
    const api = controller ??= createProductionLocalMachineController();
    const rate = await api.consumeRateLimit(guarded.rateKey!, 120);
    if (!rate.allowed) return rateLimited(rate.retryAfterSeconds);
  } catch (error) { return connectorFailure(error); }
  const parsed = await parseBoundedJson(request, heartbeatInput);
  if ("response" in parsed) return parsed.response;
  try {
    const result = await (controller ??= createProductionLocalMachineController()).heartbeat({ ...parsed.input, token: guarded.token! });
    return connectorJson(result);
  } catch (error) { return connectorFailure(error); }
}
