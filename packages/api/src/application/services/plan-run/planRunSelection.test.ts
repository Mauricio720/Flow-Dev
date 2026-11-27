import { describe, expect, it } from "vitest";
import type { TerminalSessionStatus } from "../../terminal/terminalSessionStatus";
import { storedItem, taskSetOf } from "../tasks-set/planFixture";
import type { StoredPlan, StoredPlanItem } from "../tasks-set/planTypes";
import { buildPlanView } from "../tasks-set/planView";
import type { TaskStatus } from "../tasks-set/taskSetTypes";
import { decidePlanRun } from "./planRunSelection";
import type { CurrentSession } from "./planRunSelection";

type Statuses = Record<string, TaskStatus>;
type Scenario = { items: StoredPlanItem[]; statuses?: Statuses; edges?: Array<[string, string]>; working?: boolean; current?: CurrentSession | null };

const IDS = ["task_01", "task_02", "task_03"];
const session = (status: TerminalSessionStatus) => ({ id: `session-${status}`, status });

function decide({ items, statuses = {}, edges = [], working = false, current = null }: Scenario) {
  const set = taskSetOf({ ids: IDS, edges, statuses });
  const plan: StoredPlan = { id: "plan", version: 1, tasksFolder: set.folder, manifestVersion: set.manifestVersion, savedGraph: null, items };
  return decidePlanRun({ items: buildPlanView({ plan, set, canEdit: true, agents: [] }).items, set, working, current });
}

const s1 = (overrides: Partial<StoredPlanItem> = {}) => storedItem({ id: "s1", taskIds: ["task_01"], ...overrides });
const s2 = (overrides: Partial<StoredPlanItem> = {}) => storedItem({ id: "s2", taskIds: ["task_02"], position: 2, ...overrides });
const s3 = (overrides: Partial<StoredPlanItem> = {}) => storedItem({ id: "s3", taskIds: ["task_03"], position: 3, ...overrides });
const startedWith = (status: TerminalSessionStatus) => ({ started: true, latestSession: session(status) });

describe("decidePlanRun", () => {
  it("V-05a waits while an agent of the feature is working, even with a ready session", () => {
    expect(decide({ items: [s1(), s2()], working: true })).toEqual({ kind: "wait" });
  });

  it("V-05b starts the first ready session when the other sessions only wait for a message or were interrupted", () => {
    expect(decide({ items: [s1(), s2()], working: false })).toEqual({ kind: "start", itemId: "s1" });
  });

  it("V-05c skips a blocked session and starts the next ready one", () => {
    expect(decide({ items: [s1({ taskIds: ["task_02"] }), s2({ taskIds: ["task_01"] })], edges: [["task_03", "task_02"]] })).toEqual({ kind: "start", itemId: "s2" });
  });

  it("V-05d pauses when the current session finished its turn with open tasks", () => {
    const decision = decide({ items: [s1(startedWith("waiting")), s2()], statuses: { task_01: "in_progress" }, current: { itemId: "s1", status: "waiting", launchError: null } });
    expect(decision).toEqual({ kind: "pause", code: "session_unfinished", reason: "A Sessão 1 terminou com tarefas não concluídas: 01.", itemId: "s1" });
  });

  it("V-05e pauses when the current session failed to open, with the reason", () => {
    const decision = decide({ items: [s1({ latestSession: session("launch_failed") }), s2()], current: { itemId: "s1", status: "launch_failed", launchError: "o Claude Code não respondeu" } });
    expect(decision).toEqual({ kind: "pause", code: "session_launch_failed", reason: "A Sessão 1 falhou ao abrir: o Claude Code não respondeu.", itemId: "s1" });
  });

  it("V-05f moves on when the current session ended with every task completed", () => {
    expect(decide({ items: [s1(startedWith("ended")), s2()], statuses: { task_01: "completed" }, current: { itemId: "s1", status: "ended", launchError: null } })).toEqual({ kind: "start", itemId: "s2" });
  });

  it("V-05g pauses when the next session has no tasks", () => {
    const decision = decide({ items: [s1(startedWith("ended")), s2({ taskIds: [] })], statuses: { task_01: "completed" } });
    expect(decision).toEqual({ kind: "pause", code: "session_empty", reason: "A Sessão 2 está sem tarefas. Adicione tarefas ou remova a sessão.", itemId: "s2" });
  });

  it("V-05h completes when every session is completed", () => {
    expect(decide({ items: [s1(startedWith("waiting")), s2(startedWith("ended"))], statuses: { task_01: "completed", task_02: "completed" } })).toEqual({ kind: "complete" });
  });

  it("V-05i pauses when nothing can start, with one sentence per missing session in order", () => {
    const decision = decide({ items: [s1(startedWith("ended")), s2(), s3(startedWith("ended"))], edges: [["task_01", "task_02"]], statuses: { task_01: "in_progress", task_03: "completed" } });
    expect(decision).toEqual({ kind: "pause", code: "nothing_to_start", reason: "Nenhuma sessão pode começar. A Sessão 1 foi encerrada com tarefas não concluídas. A Sessão 2 aguarda 01.", itemId: null });
  });

  it("V-05j names a session waited for through the start-after condition", () => {
    const decision = decide({ items: [s1(startedWith("ended")), s2(startedWith("ended")), s3({ after: ["s2"] })], statuses: { task_01: "completed", task_02: "in_progress" } });
    expect(decision).toMatchObject({ kind: "pause", reason: "Nenhuma sessão pode começar. A Sessão 2 foi encerrada com tarefas não concluídas. A Sessão 3 aguarda a Sessão 2." });
  });

  it("V-05k waits for a session started by hand and goes on once it finished its tasks", () => {
    expect(decide({ items: [s1(startedWith("ended")), s2(startedWith("running")), s3()], statuses: { task_01: "completed" }, working: true })).toEqual({ kind: "wait" });
    expect(decide({ items: [s1(startedWith("ended")), s2(startedWith("waiting")), s3()], statuses: { task_01: "completed", task_02: "completed" } })).toEqual({ kind: "start", itemId: "s3" });
  });

  it("V-05l waits while an automatic review or a pending question keeps an agent working", () => {
    expect(decide({ items: [s1()], working: true, current: null })).toEqual({ kind: "wait" });
    expect(decide({ items: [s1(startedWith("asking")), s2()], working: true, current: { itemId: "s1", status: "asking", launchError: null } })).toEqual({ kind: "wait" });
  });

  it("V-05m treats a current session that is opening or waiting for confirmation as not stopped", () => {
    expect(decide({ items: [s1({ latestSession: session("opening") }), s2()], current: { itemId: "s1", status: "opening", launchError: null } })).toEqual({ kind: "start", itemId: "s2" });
    expect(decide({ items: [s1({ latestSession: session("unconfirmed") }), s2()], current: { itemId: "s1", status: "unconfirmed", launchError: null } })).toEqual({ kind: "start", itemId: "s2" });
  });

  it("V-05n does not pick a ready session already started by hand", () => {
    expect(decide({ items: [s1(startedWith("ended")), s2({ started: true, latestSession: session("interrupted") }), s3()], statuses: { task_01: "completed" } })).toEqual({ kind: "start", itemId: "s3" });
  });
});
