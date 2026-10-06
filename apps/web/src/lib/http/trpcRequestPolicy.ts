const MAX_TRPC_BODY_BYTES = 512 * 1024;
const MAX_TRPC_BATCH_SIZE = 5;

export async function enforceTrpcRequestPolicy(request: Request) {
  if (request.method !== "POST") return { request };
  if (!hasAllowedOrigin(request)) return { response: policyError("origin_denied", 403) };
  if (batchSize(request) > MAX_TRPC_BATCH_SIZE) return { response: policyError("input_capacity", 413) };
  if (request.body === null) return { request };
  const body = await readBoundedBody(request.body, MAX_TRPC_BODY_BYTES);
  if (!body) return { response: policyError("input_capacity", 413) };
  return { request: new Request(request.url, { method: request.method, headers: request.headers, body, signal: request.signal }) };
}

function hasAllowedOrigin(request: Request) {
  const allowedOrigin = process.env.BETTER_AUTH_URL;
  const origin = request.headers.get("origin");
  if (!allowedOrigin || !origin) return false;
  try { return new URL(origin).origin === new URL(allowedOrigin).origin; } catch { return false; }
}

function batchSize(request: Request) {
  if (new URL(request.url).searchParams.get("batch") !== "1") return 1;
  return new URL(request.url).pathname.split("/api/trpc/")[1]?.split("/")[0]?.split(",").length ?? 1;
}

async function readBoundedBody(stream: ReadableStream<Uint8Array>, limit: number) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}

function policyError(reason: string, status: number) {
  return Response.json({ error: { reason, message: "A solicitação excede a política de segurança" } }, { status, headers: { "cache-control": "no-store" } });
}
