import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { desc, eq } from "drizzle-orm";
import { taskArtifacts, taskArtifactVersions } from "../src/infra/database/schema";
import { DrizzleSessionControlDao } from "../src/infra/database/dao/terminal/drizzleSessionControlDao";
import { codexWorkerFlow } from "./support/codexWorkerFlowSupport";
import { flowDevWorld, HOST_ID, insertFlowDevSession } from "./session-interaction-support";
import { closeTaskFixture } from "./task-api-support";
import { seedStoredPlan, seedTaskSet } from "./plan-support";

const roots: string[] = [];
afterEach(async () => { await closeTaskFixture(); await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("Codex plan item capture", () => {
  it("V-54a captures task_NN at Stop with the plan skill and no explicit skill input", async () => {
    const { setup, decisionId } = await flowDevWorld();
    await seedTaskSet({ setup }, { ids: ["task_01"] });
    const { items } = await seedStoredPlan({ setup }, { items: [{ taskIds: ["task_01"], choice: { agent: "codex", model: "model-1", effort: "high" } }] });
    const root = await mkdtemp(join(tmpdir(), "codex-plan-capture-"));
    roots.push(root);
    const checkout = join(root, "checkout");
    const relativePath = "docs/specs/login/task_01.md";
    await mkdir(join(checkout, "docs/specs/login"), { recursive: true });
    await writeFile(join(checkout, relativePath), "# Task 01\n");
    const session = await insertFlowDevSession(setup, decisionId, { agent: "codex", hostId: HOST_ID, status: "opening", preparedAt: new Date(), model: "model-1", effort: "high", purpose: "plan_item", planItemId: items[0]!.id, checkoutPath: checkout });
    const record = join(root, "requests.jsonl");
    const script = { methods: ["initialize", "skills/extraRoots/set", "thread/start", "turn/start"], recordPath: record, results: { initialize: {}, "skills/extraRoots/set": {}, "thread/start": { thread: { id: "thread-plan" } }, "turn/start": { turn: { id: "turn-plan" } } }, notificationsByMethod: { "turn/start": [{ jsonrpc: "2.0", method: "item/completed", params: { threadId: "thread-plan", item: { type: "fileChange", changes: [{ path: relativePath, kind: { type: "add" }, diff: "" }] } } }, { jsonrpc: "2.0", method: "turn/completed", params: { threadId: "thread-plan" } }] } };
    const { worker } = await codexWorkerFlow({ database: setup.database, stateRoot: root, sessionId: session.id, checkout, prompt: "Implemente, nesta ordem, as tarefas docs/specs/login/task_01.md", script });
    try {
      await worker.supervisor.tick();
      await waitFor(record);
      await worker.idle();
      expect((await readFile(record, "utf8")).match(/"type":"skill"/g)).toBeNull();
      const [artifact] = await setup.database.select().from(taskArtifacts).where(eq(taskArtifacts.relativePath, relativePath));
      const [version] = await setup.database.select().from(taskArtifactVersions).where(eq(taskArtifactVersions.artifactId, artifact!.id)).orderBy(desc(taskArtifactVersions.version));
      expect(artifact).toMatchObject({ latestVersion: 2 });
      expect(version).toMatchObject({ content: "# Task 01\n", skill: "plano-de-execucao", trigger: "stop" });
      await new DrizzleSessionControlDao(setup.database).requestEnd(session.id, new Date());
      await worker.supervisor.tick();
    } finally { await worker.registry.abandonAll(); }
  });
});

async function waitFor(path: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if ((await readFile(path, "utf8").catch(() => "")).includes("turn/start")) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Codex plan turn was not started");
}
