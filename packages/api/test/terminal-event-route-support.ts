import { openedSession } from "./terminal-event-support";

type Controller = Awaited<ReturnType<typeof openedSession>>["controller"];

export const EVENTS_URL = "https://flow.test/api/terminal-sessions/events";
export const MAX_BODY_BYTES = 5 * 1024 * 1024;

const state = { current: null as unknown as Controller };

export const routeDelegate = {
  authenticate: (...args: Parameters<Controller["authenticate"]>) => state.current.authenticate(...args),
  ingest: (...args: Parameters<Controller["ingest"]>) => state.current.ingest(...args),
  dropOversized: (...args: Parameters<Controller["dropOversized"]>) => state.current.dropOversized(...args),
  capture: (...args: Parameters<Controller["capture"]>) => state.current.capture(...args),
};

export const afterCallbacks: Array<() => unknown> = [];

export async function runAfterCallbacks() {
  await Promise.all(afterCallbacks.splice(0).map((callback) => callback()));
}

export async function routeWorld(handler: (request: Request) => Promise<Response>) {
  const opened = await openedSession();
  state.current = opened.controller;
  const post = (body: BodyInit, headers: Record<string, string> = { authorization: `Bearer ${opened.token}` }) => handler(new Request(EVENTS_URL, { method: "POST", headers, body }));
  return { ...opened, post };
}
