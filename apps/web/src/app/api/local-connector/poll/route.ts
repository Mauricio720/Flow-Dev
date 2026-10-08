import { createProductionLocalMachineController } from "@flow-dev/api/server";
import { commandPollInput, connectorFailure, connectorJson, guardConnectorRequest, parseBoundedJson, rateLimited } from "@/lib/http/localConnector";

export const runtime = "nodejs";
let controller: ReturnType<typeof createProductionLocalMachineController> | undefined;

export async function POST(request: Request): Promise<Response> {
  const guarded = guardConnectorRequest(request, "machine");
  if (guarded.response) return guarded.response;
  try {
    const api = controller ??= createProductionLocalMachineController();
    const rate = await api.consumeRateLimit(`${guarded.rateKey!}:poll`, 120);
    if (!rate.allowed) return rateLimited(rate.retryAfterSeconds);
  } catch (error) { return connectorFailure(error); }
  const parsed = await parseBoundedJson(request, commandPollInput);
  if ("response" in parsed) return parsed.response!;
  try { return connectorJson(await (controller ??= createProductionLocalMachineController()).poll({ ...parsed.input, token: guarded.token! })); }
  catch (error) { return connectorFailure(error); }
}
