import { describe, expect, it, vi } from "vitest";
import type { CapturedFile, TaskSetReadDao } from "../../database/dao/taskSetReadDao";
import type { PlanLog } from "./planLog";
import { manifestWith } from "./manifestFixture";
import { TaskSetLoader } from "./taskSetLoader";

const TASK_ID = "task-1";
const FOLDER = "docs/specs/login";
const WITHOUT_GRAPH = '---\nschema_version: "compozy.tasks/v2"\nworkflow: demo\n---\n';
const GRAPH_MISSING = "o grafo de tarefas está ausente";

const manifestVersion = (version: number, content: string): CapturedFile => ({ artifactId: "manifest", path: `${FOLDER}/_tasks.md`, version, capturedAt: new Date("2026-11-23T10:00:00Z"), content });

function loaderWith(manifests: CapturedFile[]) {
  const dao: TaskSetReadDao = { taskInProject: async () => true, specs: async () => [], manifests: async () => manifests, folderFiles: async () => [] };
  const log: PlanLog = { manifestInvalid: vi.fn(), saved: vi.fn(), conflict: vi.fn(), itemStarted: vi.fn(), runStarted: vi.fn(), runSessionStarted: vi.fn(), runPaused: vi.fn(), runResumed: vi.fn(), runCompleted: vi.fn() };
  return { log, loader: new TaskSetLoader(dao, log), manifests };
}

describe("TaskSetLoader logging", () => {
  it("logs an invalid manifest once per version, however many times it is read", async () => {
    const { loader, log } = loaderWith([manifestVersion(1, WITHOUT_GRAPH)]);
    for (let reads = 0; reads < 3; reads += 1) await loader.load(TASK_ID);
    expect(log.manifestInvalid).toHaveBeenCalledTimes(1);
    expect(log.manifestInvalid).toHaveBeenCalledWith({ folder: FOLDER, reason: GRAPH_MISSING });
  });

  it("logs again when a newer version of the manifest is still invalid", async () => {
    const first = loaderWith([manifestVersion(1, WITHOUT_GRAPH)]);
    await first.loader.load(TASK_ID);
    first.manifests.splice(0, 1, manifestVersion(2, WITHOUT_GRAPH));
    await first.loader.load(TASK_ID);
    expect(first.log.manifestInvalid).toHaveBeenCalledTimes(2);
  });

  it("does not log a valid manifest", async () => {
    const { loader, log } = loaderWith([manifestVersion(1, manifestWith({ ids: ["task_01"] }))]);
    await loader.load(TASK_ID);
    expect(log.manifestInvalid).not.toHaveBeenCalled();
  });
});
