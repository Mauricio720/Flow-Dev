import { CodexAppServerRuntime } from "../../src/infra/terminal/codex/codexAppServerRuntime";
import { CODEX_FAKE_SCRIPT_VARIABLE, CodexProcess } from "../../src/infra/terminal/codex/codexProcess";

type LogFields = Record<string, string | number | boolean | null>;
export type CodexLogSink = ReturnType<typeof codexLogSink>;

export const MODEL_STATUS = { available: true, reason: null, version: "0.159.3", refreshedAt: "2026-11-24T00:00:00.000Z", models: [{ id: "model-1", label: "Model", isDefault: true, efforts: ["high"], defaultEffort: "high" }] };

export function codexLogSink() {
  const entries: Array<{ event: string } & LogFields> = [];
  const waiting: Array<{ event: string; resolve: () => void }> = [];
  const info = (event: string, fields: LogFields = {}) => {
    entries.push({ event, ...fields });
    for (const waiter of waiting.filter((item) => item.event === event)) waiter.resolve();
  };
  const logged = (event: string) => new Promise<void>((resolve) => {
    if (entries.some((entry) => entry.event === event)) resolve();
    else waiting.push({ event, resolve });
  });
  return { entries, info, logged };
}

export function scriptedCodexRuntime(scriptPath: string, sink = codexLogSink()) {
  const env = { ...process.env, NODE_ENV: "test", [CODEX_FAKE_SCRIPT_VARIABLE]: scriptPath };
  const codexProcess = new CodexProcess({ locate: async () => null, has: async () => false }, env);
  return new CodexAppServerRuntime({ process: codexProcess, probe: { read: async () => MODEL_STATUS }, log: { info: sink.info, error: () => undefined } });
}

