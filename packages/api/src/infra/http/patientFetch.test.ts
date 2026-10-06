import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { patientFetch } from "./patientFetch";

let server: Server | undefined;
afterEach(() => new Promise<void>((resolve) => { server?.closeAllConnections(); server ? server.close(() => resolve()) : resolve(); server = undefined; }));

function listen(handler: Parameters<typeof createServer>[1]) {
  return new Promise<string>((resolve) => {
    server = createServer(handler);
    server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${(server!.address() as AddressInfo).port}`));
  });
}

describe("patientFetch", () => {
  it("sends the method, headers and body and exposes status, headers and the streamed body", async () => {
    const origin = await listen((request, response) => {
      let received = "";
      request.on("data", (chunk) => { received += chunk; });
      request.on("end", () => { response.writeHead(429, { "retry-after": "30", "content-type": "application/json" }); response.end(JSON.stringify({ method: request.method, authorization: request.headers.authorization, received })); });
    });
    const response = await patientFetch(new URL("/generate", origin), { method: "POST", headers: { authorization: "Bearer key" }, body: "payload" });
    expect(response.ok).toBe(false);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("30");
    await expect(response.json()).resolves.toEqual({ method: "POST", authorization: "Bearer key", received: "payload" });
  });
  it("rejects when the caller aborts before the response headers arrive", async () => {
    const origin = await listen(() => {});
    const controller = new AbortController();
    const pending = patientFetch(origin, { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toThrow();
  });
});
