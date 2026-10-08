import { createProductionLocalMachineController } from "@flow-dev/api/server";
import { connectorFailure, connectorJson, guardConnectorRequest, pairingExchangeInput, parseBoundedJson, rateLimited } from "@/lib/http/localConnector";

export const runtime = "nodejs";
let controller: ReturnType<typeof createProductionLocalMachineController> | undefined;

export async function POST(request: Request) {
  const guarded = guardConnectorRequest(request, "pairing");
  if (guarded.response) return guarded.response;
  try {
    const api = controller ??= createProductionLocalMachineController();
    const rate = await api.consumeRateLimit(`${guarded.rateKey!}:exchange`, 120);
    if (!rate.allowed) return rateLimited(rate.retryAfterSeconds);
  } catch (error) { return connectorFailure(error); }
  const parsed = await parseBoundedJson(request, pairingExchangeInput);
  if ("response" in parsed) return parsed.response;
  try {
    const result = await (controller ??= createProductionLocalMachineController()).exchange(parsed.input);
    return connectorJson(result, result.state === "pending" ? 202 : 201);
  } catch (error) { return connectorFailure(error); }
}
