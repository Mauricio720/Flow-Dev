import { describe, expect, it } from "vitest";
import type { LockedSession } from "../../database/dao/terminalEventDao";
import type { SummarizedHookEvent } from "./hookEventSummarizer";
import { planIngestion } from "./terminalEventIngestion";

const NOW = new Date("2026-11-23T14:32:00Z");
const FOLDER = "docs/specs/login";

function sessionOf(overrides: Partial<LockedSession> = {}): LockedSession {
  return { id: "s1", status: "running", checkoutPath: "/work/shop", activeSkill: null, startedAt: NOW, planTasksFolder: FOLDER, ...overrides };
}

function editOf(path: string): SummarizedHookEvent {
  return { events: [{ kind: "file_edit", summary: path, path, skill: null }], claudeSessionId: null, endReason: null, captureTrigger: null };
}

const skillsOf = (session: LockedSession, path: string) => planIngestion({ session, summarized: editOf(path), now: NOW }).events.map((event) => event.skill);

describe("planIngestion in a plan session", () => {
  it("V-39a attributes a Markdown edit inside the task folder to the plan when no skill is active", () => {
    expect(skillsOf(sessionOf(), "docs/specs/login/task_01.md")).toEqual(["plano-de-execucao"]);
  });

  it("V-39b leaves an edit outside the folder, or of another type, without a skill", () => {
    expect(skillsOf(sessionOf(), "README.md")).toEqual([null]);
    expect(skillsOf(sessionOf(), "docs/specs/outra/spec.md")).toEqual([null]);
    expect(skillsOf(sessionOf(), "docs/specs/login-old/task_01.md")).toEqual([null]);
    expect(skillsOf(sessionOf(), "docs/specs/login/notas.txt")).toEqual([null]);
  });

  it("V-39c leaves the edit without a skill in a session that is not from a plan", () => {
    expect(skillsOf(sessionOf({ planTasksFolder: null }), "docs/specs/login/task_01.md")).toEqual([null]);
  });

  it("V-39d keeps the active skill, and does not change the active skill of the session", () => {
    const plan = planIngestion({ session: sessionOf({ activeSkill: "spec-to-tasks" }), summarized: editOf("docs/specs/login/task_02.md"), now: NOW });
    expect(plan.events.map((event) => event.skill)).toEqual(["spec-to-tasks"]);
    const noSkill = planIngestion({ session: sessionOf(), summarized: editOf("docs/specs/login/task_02.md"), now: NOW });
    expect(noSkill.changes).not.toHaveProperty("activeSkill");
  });
});
