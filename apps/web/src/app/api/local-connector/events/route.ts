import { createProductionLocalMachineController } from "@flow-dev/api/server";
import { commandEventsInput, connectorFailure, connectorJson, guardConnectorRequest, parseBoundedJson, rateLimited } from "@/lib/http/localConnector";

export const runtime = "nodejs";
let controller: ReturnType<typeof createProductionLocalMachineController> | undefined;

export async function POST(request: Request) {
  const guarded = guardConnectorRequest(request, "machine");
  if (guarded.response) return guarded.response;
  try {
    const api = controller ??= createProductionLocalMachineController();
    const rate = await api.consumeRateLimit(`${guarded.rateKey!}:events`, 240);
    if (!rate.allowed) return rateLimited(rate.retryAfterSeconds);
  } catch (error) { return connectorFailure(error); }
  const parsed = await parseBoundedJson(request, commandEventsInput);
  if ("response" in parsed) return parsed.response;
  try { return connectorJson(await (controller ??= createProductionLocalMachineController()).events({ ...parsed.input, token: guarded.token! })); }
  catch (error) { return connectorFailure(error); }
}
