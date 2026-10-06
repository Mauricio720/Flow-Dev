import { vi } from "vitest";
import { C } from "./tasks";

const PREFLIGHT_PATH = "/api/task-dictation/preflight";
const DISCLOSURE_KEY = "flow-dev:dictation-disclosure";
const LIMITS = { maxSeconds: 180, maxBytes: 10 * 1024 * 1024 };

export class FakeTrack extends EventTarget {
  stop = vi.fn();
  end() {
    this.dispatchEvent(new Event("ended"));
  }
}

export class FakeRecorder extends EventTarget {
  static isTypeSupported = (type: string) => type.startsWith("audio/webm");
  state = "inactive";
  readonly mimeType: string;
  constructor(_stream: unknown, options: { mimeType: string }) {
    super();
    this.mimeType = options.mimeType;
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    queueMicrotask(() => {
      this.dispatchEvent(Object.assign(new Event("dataavailable"), { data: new Blob(["audio"]) }));
      this.dispatchEvent(new Event("stop"));
    });
  }
}

type Upload = () => Promise<Response>;
type Options = { getUserMedia?: () => Promise<unknown>; upload?: Upload; release?: () => Promise<Response> };

export function transcript(text: string): Upload {
  return async () => Response.json({ captureId: C, text });
}

export function installDictation(options: Options = {}) {
  const tracks: FakeTrack[] = [];
  const openMicrophone = async () => {
    tracks.push(new FakeTrack());
    return { getTracks: () => [tracks.at(-1)] };
  };
  const getUserMedia = vi.fn(options.getUserMedia ?? openMicrophone);
  const upload = vi.fn(options.upload ?? transcript("ao remover item"));
  const preflight = vi.fn(async (body: { action: string }) => {
    if (body.action === "cancel") return options.release ? options.release() : Response.json({ released: true });
    return Response.json({ captureId: C, captureToken: "token", expiresAt: "2026-10-01T12:05:00.000Z", limits: LIMITS });
  });
  const fetchMock = vi.fn((url: string, init: RequestInit) => (url === PREFLIGHT_PATH ? preflight(JSON.parse(String(init.body))) : upload()));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  window.localStorage.setItem(DISCLOSURE_KEY, "accepted");
  return { tracks, getUserMedia, upload, preflight };
}

export function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
  document.dispatchEvent(new Event("visibilitychange"));
}
