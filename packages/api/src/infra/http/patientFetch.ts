import type { IncomingMessage } from "node:http";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";

const SECURE_PROTOCOL = "https:";
const BODYLESS_STATUSES = [204, 205, 304];
const MISSING_STATUS = 502;

// Node's fetch gives up after 300 s without response headers; this request waits until the caller's signal aborts it.
export const patientFetch: typeof fetch = (input, init) => new Promise<Response>((resolve, reject) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  const send = url.protocol === SECURE_PROTOCOL ? httpsRequest : httpRequest;
  const options = { method: init?.method, headers: Object.fromEntries(new Headers(init?.headers)), signal: init?.signal ?? undefined };
  const outgoing = send(url, options, (incoming) => resolve(toResponse(incoming)));
  outgoing.on("error", reject);
  outgoing.end(typeof init?.body === "string" ? init.body : undefined);
});

function toResponse(incoming: IncomingMessage) {
  const status = incoming.statusCode ?? MISSING_STATUS;
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) for (const item of [value ?? []].flat()) headers.append(name, item);
  if (BODYLESS_STATUSES.includes(status)) { incoming.resume(); return new Response(null, { status, headers }); }
  return new Response(Readable.toWeb(incoming) as ReadableStream<Uint8Array>, { status, headers });
}
