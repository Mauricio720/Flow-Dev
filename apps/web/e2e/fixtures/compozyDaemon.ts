import { createServer } from "node:http";
import { FakeCompozyHttpApi } from "./compozyDaemonState";

const LOOPBACK = "127.0.0.1";

export { FAKE_WORKSPACE_ID, type FakeCompozyControl } from "./compozyDaemonState";

export async function startFakeCompozy(baseUrl: string) {
  const port = Number(new URL(baseUrl).port);
  const api = new FakeCompozyHttpApi(port);
  const server = createServer((request, response) => void api.route(request, response));
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(port, LOOPBACK, resolve); });
  const stop = () => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); });
  return { stop, control: api.control() };
}
