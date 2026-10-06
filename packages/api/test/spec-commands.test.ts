import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeTaskFixture } from "./task-api-support";
import { SPEC_COMMANDS, callProcedure, specInputs } from "./spec-calls";
import { rejection, specCaller, specTask, startInput } from "./spec-support";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(closeTaskFixture);

describe.each([...SPEC_COMMANDS, "submission"] as const)("taskSpec.%s command guards", (name) => {
  it("IT-172 requires the immutable author", async () => {
    const setup = await specTask();
    await setup.authorize(setup.readerId);
    const result = await rejection(callProcedure(specCaller(setup, setup.readerId), name, specInputs(setup)[name]));
    expect(result).toMatchObject({ code: "FORBIDDEN", reason: "author_required" });
  });
});

describe.each(SPEC_COMMANDS)("taskSpec.%s receipts", (name) => {
  it("IT-173 rejects a request key reused for another action or payload", async () => {
    const setup = await specTask();
    const requestKey = crypto.randomUUID();
    await specCaller(setup).start(startInput(setup, { requestKey }));
    const input = specInputs(setup, { requestKey })[name];
    expect(await rejection(callProcedure(specCaller(setup), name, name === "start" ? { ...input, stage: "tech_spec" } : input))).toMatchObject({ code: "CONFLICT", reason: "request_key_reused" });
  });

  it("IT-174 rejects a stale expected version without a matching receipt", async () => {
    const setup = await specTask();
    await specCaller(setup).start(startInput(setup));
    const result = await rejection(callProcedure(specCaller(setup), name, specInputs(setup)[name]));
    expect(result).toMatchObject({ code: "CONFLICT", reason: "spec_conflict" });
  });
});

describe("taskSpec stage prerequisites", () => {
  it("IT-179 rejects start and approve while the upstream stage is not approved", async () => {
    const setup = await specTask();
    await specCaller(setup).start(startInput(setup));
    const inputs = specInputs(setup, { expectedSpecVersion: 1 });
    expect(await rejection(specCaller(setup).approve(inputs.approve as never))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "stage_prerequisite" });
    expect(await rejection(specCaller(setup).start({ ...inputs.start, stage: "tasks" } as never))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "stage_prerequisite" });
  });
});
