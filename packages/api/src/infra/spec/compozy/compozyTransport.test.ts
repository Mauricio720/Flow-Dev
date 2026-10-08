import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { unixSocketTransport } from "./compozyTransport";

let directory = "";
let server: Server | undefined;
afterEach(async () => { server?.closeAllConnections(); await new Promise((done) => (server ? server.close(done) : done(null))); await rm(directory, { recursive: true, force: true }); });

const IDLE_MS = 2000;
const DEADLINE_MS = 300;
const TRICKLE_MS = 50;

async function trickling() {
  directory = await mkdtemp(join(tmpdir(), "flow-transport-"));
  const socketPath = join(directory, "runtime.sock");
  server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    const timer = setInterval(() => response.write(" "), TRICKLE_MS);
    response.on("close", () => clearInterval(timer));
  });
  await new Promise<void>((ready) => server!.listen(socketPath, ready));
  return socketPath;
}

describe("unixSocketTransport deadline", () => {
  it("cuts a request the runtime keeps open even though data keeps arriving", async () => {
    const transport = unixSocketTransport(await trickling(), IDLE_MS, DEADLINE_MS);
    const startedAt = Date.now();
    await expect(transport({ method: "POST", path: "/prompt", body: {} })).rejects.toMatchObject({ name: "CompozyTransportError", kind: "timeout" });
    expect(Date.now() - startedAt).toBeLessThan(IDLE_MS);
  });
});
