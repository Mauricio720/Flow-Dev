import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskPlanningDecisions, taskSpecAttempts, taskSpecCommands, taskSpecWorkflows } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { githubResponse } from "./fixture";
import { approvePlanning, rejection, specCaller, specScope, specTask, startInput, unpublishedTask } from "./spec-support";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(closeTaskFixture);

describe("spec start", () => {
  it("IT-158 accepts the first stage and queues one attempt for the selected route", async () => {
    const setup = await specTask("prd");
    const receipt = await specCaller(setup).start(startInput(setup));
    expect(receipt).toMatchObject({ status: "accepted", specVersion: 1, packageId: null, reason: null });
    const attempts = await setup.database.select().from(taskSpecAttempts);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({ id: receipt.attemptId, state: "queued", kind: "generate", attemptNumber: 1, stage: "prd" });
    expect(attempts[0]?.promptMessageId).toBeTruthy();
  });

  it("IT-001 blocks an unsupported saved route without a replacement stage", async () => {
    const setup = await specTask("tech_spec", false);
    await setup.database.execute(`ALTER TABLE task_planning_decisions DROP CONSTRAINT task_planning_decisions_route_check, DROP CONSTRAINT task_planning_decisions_source_check` as never);
    await setup.database.update(taskPlanningDecisions).set({ selectedRoute: "unknown", version: 2 } as never).where(eq(taskPlanningDecisions.taskId, setup.taskId));
    await approvePlanning(setup);
    const detail = await specCaller(setup).byTask(specScope(setup));
    expect(detail.blockers).toEqual(["route_unsupported"]);
    expect(detail.eligibility).toMatchObject({ canStart: false, firstStage: null });
    expect(await rejection(specCaller(setup).start(startInput(setup)))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "route_unsupported" });
  });

  it("IT-002 and IT-007 never start from reads or an unapproved planning decision", async () => {
    const setup = await specTask("prd", false);
    const caller = specCaller(setup);
    const detail = await caller.byTask(specScope(setup));
    expect(detail.blockers).toEqual(["planning_required"]);
    expect(await rejection(caller.start(startInput(setup)))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "planning_required" });
    await approvePlanning(setup);
    for (let read = 0; read < 10; read += 1) await caller.byTask(specScope(setup));
    expect(await setup.database.select().from(taskSpecAttempts)).toHaveLength(0);
    expect(await setup.database.select().from(taskSpecWorkflows)).toHaveLength(0);
  });

  it("IT-004 and IT-172 reject a reader and a nonauthor administrator without dispatch", async () => {
    const setup = await specTask();
    await setup.authorize(setup.readerId);
    const result = await rejection(specCaller(setup, setup.readerId).start(startInput(setup)));
    expect(result).toMatchObject({ code: "FORBIDDEN", reason: "author_required" });
    expect(await setup.database.select().from(taskSpecAttempts)).toHaveLength(0);
  });

  it("IT-005 and IT-015 let one request key win a race and refresh the loser to the winner", async () => {
    const setup = await specTask();
    const caller = specCaller(setup);
    const results = await Promise.allSettled([caller.start(startInput(setup)), caller.start(startInput(setup))]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const loser = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(loser.reason).toMatchObject({ code: "CONFLICT", cause: { reason: "spec_conflict" } });
    expect(await setup.database.select().from(taskSpecAttempts)).toHaveLength(1);
    expect((await caller.byTask(specScope(setup))).attempt).toMatchObject({ state: "queued" });
  });

  it("IT-008 and IT-018 enforce route stage prerequisites", async () => {
    const setup = await specTask("prd");
    const caller = specCaller(setup);
    for (const stage of ["tech_spec", "tasks"] as const) expect(await rejection(caller.start(startInput(setup, { stage })))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "stage_prerequisite" });
    expect(await setup.database.select().from(taskSpecAttempts)).toHaveLength(0);
  });

  it("IT-011 reports a task under a foreign project as unavailable", async () => {
    const setup = await specTask();
    const other = await setup.createProject({ githubId: "404", nodeId: "R_404", owner: "acme", name: "other", visibility: "private", archived: false }, "Other");
    await setup.permissions.assign(setup.ownerId, other.id, setup.readerId);
    setup.githubFetcher.mockImplementation(async (url) => githubResponse(String(url), { githubId: "404", nodeId: "R_404", owner: "acme", name: "other", visibility: "private", archived: false }));
    const caller = specCaller(setup);
    expect(await rejection(caller.byTask({ projectId: other.id, taskId: setup.taskId }))).toMatchObject({ code: "NOT_FOUND", reason: "spec_unavailable" });
    expect(await rejection(caller.start({ ...startInput(setup), projectId: other.id }))).toMatchObject({ code: "NOT_FOUND", reason: "spec_unavailable" });
  });

  it("IT-012 and IT-176 require the retained published snapshot", async () => {
    const lacking = await specTask("prd", true, "");
    expect(await rejection(specCaller(lacking).start(startInput(lacking)))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "publication_required" });
    await closeTaskFixture();
    const draft = await unpublishedTask();
    expect(await rejection(specCaller(draft).start(startInput(draft)))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "publication_required" });
  });

  it("IT-177 and IT-178 reject unapproved planning and a direct execution route", async () => {
    const setup = await specTask("direct_execution");
    expect(await rejection(specCaller(setup).start(startInput(setup)))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "route_unsupported" });
  });

  it("IT-014 requires current personal repository authorization even for public repositories", async () => {
    const setup = await specTask();
    await setup.database.execute(`DELETE FROM github_repository_authorizations` as never);
    expect(await rejection(specCaller(setup).start(startInput(setup)))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "repository_authorization_needed" });
    expect(await setup.database.select().from(taskSpecCommands)).toHaveLength(0);
  });
});
