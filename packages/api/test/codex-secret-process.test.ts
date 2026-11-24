import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import postgres from "postgres";
import { afterEach, describe, expect, it } from "vitest";
import { PostgresSecretAnswerSender } from "../src/infra/database/postgresSecretAnswerSender";
import { workerWorld } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

let worker: ChildProcess | null = null;
let sql: postgres.Sql | null = null;
afterEach(async () => { worker?.kill("SIGTERM"); if (worker) await once(worker, "exit"); worker = null; await sql?.end(); sql = null; await closeTaskFixture(); await cleanupTerminalFolders(); });

describe("Codex secret answer process delivery", () => {
  it("delivers plaintext to the worker process through Postgres notification", async () => {
    const world = await workerWorld();
    sql = postgres(world.setup.url, { max: 1 });
    worker = spawn(process.execPath, ["--import", "tsx/esm", "test/secret-answer-process-listener.ts"], { cwd: process.cwd(), env: { ...process.env, SECRET_TEST_DATABASE_URL: world.setup.url, SECRET_TEST_VALUE: "não registrar este segredo 9f2a" } });
    const output = collectOutput(worker);
    await waitForOutput(output, "READY");
    const sender = new PostgresSecretAnswerSender(sql, 1_000);
    expect(await sender.deliver({ requestId: crypto.randomUUID(), deliveryId: crypto.randomUUID(), answers: { token: "não registrar este segredo 9f2a" }, answeredBy: world.setup.ownerId, at: new Date().toISOString() })).toBe(true);
    expect(await waitForOutput(output, "ACCEPTED")).toContain("ACCEPTED");
  });
});

function collectOutput(child: ChildProcess) {
  let output = "";
  child.stdout?.on("data", (chunk: Buffer) => { output += chunk.toString(); });
  child.stderr?.on("data", (chunk: Buffer) => { output += chunk.toString(); });
  return { get: () => output };
}

async function waitForOutput(output: ReturnType<typeof collectOutput>, marker: string) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (output.get().includes(marker)) return output.get();
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`process_output_missing_${marker}`);
}
