import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createSessionWorker } from "../../src/infra/sessionWorkerComposition";
import type { requireDatabase } from "../../src/infra/database/client";
import { CodexAppServerRuntime } from "../../src/infra/terminal/codex/codexAppServerRuntime";
import { CODEX_FAKE_SCRIPT_VARIABLE, CodexProcess } from "../../src/infra/terminal/codex/codexProcess";
import type { CodexStatus } from "../../src/application/terminal/codexCatalog";
import { HOST_ID } from "../session-interaction-support";

const CODEX_STATUS: CodexStatus = { available: true, reason: null, version: "0.159.3", refreshedAt: new Date().toISOString(), models: [{ id: "model-1", label: "Model", isDefault: true, efforts: ["high"], defaultEffort: "high" }] };

export async function codexWorkerFlow(input: { database: ReturnType<typeof requireDatabase>; stateRoot: string; sessionId: string; checkout: string; prompt: string; script: Record<string, unknown> }) {
  const sessionDir = join(input.stateRoot, "flow-dev", "terminal-sessions", input.sessionId);
  await mkdir(join(sessionDir, "contexto", "skills"), { recursive: true });
  await mkdir(input.checkout, { recursive: true });
  await writeFile(join(sessionDir, "prompt.md"), input.prompt);
  const scriptPath = join(input.stateRoot, "fake.json");
  await writeFile(scriptPath, JSON.stringify(input.script));
  const env = { ...process.env, XDG_STATE_HOME: input.stateRoot, NODE_ENV: "test", [CODEX_FAKE_SCRIPT_VARIABLE]: scriptPath };
  const probe = { read: async () => CODEX_STATUS };
  const codexProcess = new CodexProcess({ locate: async () => null, has: async () => false }, env);
  const runtime = new CodexAppServerRuntime({ process: codexProcess, probe, log: { info: () => undefined, error: () => undefined } });
  const worker = createSessionWorker(input.database, { runtimes: { codex: runtime }, codexProbe: probe, env, hostId: HOST_ID, workerId: "worker-flow", log: { info: () => undefined, error: () => undefined } });
  return { worker, sessionDir };
}
