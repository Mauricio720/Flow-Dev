import "server-only";
import { createProductionTerminalEventController } from "@flow-dev/api/server";

const BEARER_PATTERN = /^Bearer\s+(\S+)$/;
const TEXT_DECODER = new TextDecoder();

let controller: ReturnType<typeof createProductionTerminalEventController> | undefined;

export function terminalEventController() {
  return (controller ??= createProductionTerminalEventController());
}

export function bearerToken(request: Request): string | null {
  const match = BEARER_PATTERN.exec(request.headers.get("authorization") ?? "");
  return match ? match[1]! : null;
}

export function parseEventBody(body: Uint8Array): unknown {
  try {
    return JSON.parse(TEXT_DECODER.decode(body));
  } catch {
    return undefined;
  }
}

export function eventAccepted() {
  return new Response(null, { status: 204 });
}

export function eventUnauthorized() {
  return new Response(null, { status: 401 });
}

export function eventTooLarge() {
  return new Response(null, { status: 413 });
}
