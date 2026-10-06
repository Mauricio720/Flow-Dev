import type { RuntimeCursor, RuntimeEvent } from "../../../application/spec/specRuntimeGateway";
import { eventsSchema } from "./compozySchemas";
import { callOk } from "./compozyCall";
import type { CompozyTransport } from "./compozyTransport";

const EVENT_PAGE_LIMIT = 200;

export async function* replayEvents(transport: CompozyTransport, cursor: RuntimeCursor): AsyncGenerator<RuntimeEvent> {
  let after = cursor.afterSequence;
  for (;;) {
    const query = new URLSearchParams({ after_sequence: String(after), limit: String(EVENT_PAGE_LIMIT) });
    const path = `/api/workspaces/${encodeURIComponent(cursor.workspaceId)}/sessions/${encodeURIComponent(cursor.sessionId)}/events?${query}`;
    const page = await callOk(transport, { request: { method: "GET", path }, schema: eventsSchema, accepted: [200] });
    for (const event of page.events) yield { sequence: event.sequence, id: event.id, type: event.type, turnId: event.turn_id, timestamp: event.timestamp, content: event.content };
    if (page.events.length < EVENT_PAGE_LIMIT) return;
    after = page.events.at(-1)!.sequence;
  }
}
