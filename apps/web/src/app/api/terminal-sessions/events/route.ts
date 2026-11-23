import { after } from "next/server";
import { readBodyWithinLimit } from "@/lib/http/requestBodyLimit";
import { bearerToken, eventAccepted, eventTooLarge, eventUnauthorized, parseEventBody, terminalEventController } from "@/lib/http/terminalEventRoute";

export const runtime = "nodejs";
const MAX_EVENT_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const controller = terminalEventController();
  const session = await controller.authenticate(bearerToken(request));
  if (!session) return eventUnauthorized();
  if (!session.active) return eventAccepted();
  const body = await readBodyWithinLimit(request, MAX_EVENT_BYTES);
  if (!body) {
    await controller.dropOversized(session.sessionId);
    return eventTooLarge();
  }
  const payload = parseEventBody(body);
  if (payload === undefined) return eventAccepted();
  const { captureTrigger } = await controller.ingest(session.sessionId, payload);
  if (captureTrigger) after(() => controller.capture(session.sessionId, captureTrigger));
  return eventAccepted();
}
