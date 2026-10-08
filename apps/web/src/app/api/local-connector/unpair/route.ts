import { createProductionLocalMachineController } from "@flow-dev/api/server";
import { connectorFailure, connectorJson, guardConnectorRequest, parseBoundedJson, rateLimited, unpairInput } from "@/lib/http/localConnector";

export const runtime = "nodejs";
let controller: ReturnType<typeof createProductionLocalMachineController> | undefined;

export async function POST(request: Request) {
  const guarded = guardConnectorRequest(request, "machine");
  if (guarded.response) return guarded.response;
  try {
    const api = controller ??= createProductionLocalMachineController();
    const rate = await api.consumeRateLimit(`${guarded.rateKey!}:unpair`, 10);
    if (!rate.allowed) return rateLimited(rate.retryAfterSeconds);
  } catch (error) { return connectorFailure(error); }
  const parsed = await parseBoundedJson(request, unpairInput);
  if ("response" in parsed) return parsed.response;
  try { return connectorJson(await (controller ??= createProductionLocalMachineController()).unpair({ ...parsed.input, token: guarded.token! })); }
  catch (error) { return connectorFailure(error); }
}
