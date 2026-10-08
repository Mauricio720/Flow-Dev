import { createProductionLocalMachineController } from "@flow-dev/api/server";
import { connectorFailure, connectorJson, guardConnectorRequest, pairingCreateInput, parseBoundedJson, rateLimited } from "@/lib/http/localConnector";

export const runtime = "nodejs";
let controller: ReturnType<typeof createProductionLocalMachineController> | undefined;

export async function POST(request: Request) {
  const guarded = guardConnectorRequest(request, "pairing");
  if (guarded.response) return guarded.response;
  try {
    const api = controller ??= createProductionLocalMachineController();
    const rate = await api.consumeRateLimit(`${guarded.rateKey!}:create`, 5);
    if (!rate.allowed) return rateLimited(rate.retryAfterSeconds);
  } catch (error) { return connectorFailure(error); }
  const parsed = await parseBoundedJson(request, pairingCreateInput);
  if ("response" in parsed) return parsed.response;
  try {
    const result = await (controller ??= createProductionLocalMachineController()).createPairing(parsed.input);
    const configuredOrigin = process.env.BETTER_AUTH_URL;
    if (!configuredOrigin) return connectorFailure(new Error("internal_error"));
    const confirmationUrl = new URL(`/settings/local-machine/pairing/${result.code}`, configuredOrigin);
    return connectorJson({ ...result, confirmationUrl: confirmationUrl.toString() }, 201);
  } catch (error) { return connectorFailure(error); }
}
