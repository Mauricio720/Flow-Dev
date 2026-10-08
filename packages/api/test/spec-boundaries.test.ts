import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeTaskFixture } from "./task-api-support";
import { SPEC_PROCEDURES, callProcedure, httpProcedure, specInputs } from "./spec-calls";
import { rejection, specCaller, specTask } from "./spec-support";
import type { TaskSpecDao } from "../src/application/database/dao/taskSpecDao";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(closeTaskFixture);

const CANARY = "postgres://canary-secret";

describe.each(SPEC_PROCEDURES)("taskSpec.%s boundaries", (name) => {
  it("IT-166 requires a session", async () => {
    const setup = await specTask();
    expect(await rejection(callProcedure(specCaller(setup, null), name, specInputs(setup)[name]))).toMatchObject({ code: "UNAUTHORIZED", reason: "session_required" });
  });

  it("IT-167 hides tasks outside the requested project", async () => {
    const setup = await specTask();
    const input = specInputs(setup, { taskId: crypto.randomUUID() })[name];
    expect(await rejection(callProcedure(specCaller(setup), name, input))).toMatchObject({ code: "NOT_FOUND", reason: "spec_unavailable" });
  });

  it("IT-168 requires personal repository authorization", async () => {
    const setup = await specTask();
    await setup.database.execute(`DELETE FROM github_repository_authorizations` as never);
    expect(await rejection(callProcedure(specCaller(setup), name, specInputs(setup)[name]))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "repository_authorization_needed" });
  });

  it("IT-169 reports revoked project access to a previously visible author", async () => {
    const setup = await specTask();
    await setup.database.execute(`DELETE FROM project_assignments` as never);
    await setup.database.execute(`DELETE FROM admin_designations WHERE github_user_id = '88'` as never);
    expect(await rejection(callProcedure(specCaller(setup), name, specInputs(setup)[name]))).toMatchObject({ code: "FORBIDDEN", reason: "access_revoked" });
  });

  it("IT-170 rejects malformed identifiers", async () => {
    const setup = await specTask();
    const input = specInputs(setup, { projectId: "not-a-uuid" })[name];
    expect(await httpProcedure(setup, name, input)).toEqual({ status: 400, reason: "invalid_input" });
  });

  it("IT-171 hides unexpected database failures", async () => {
    const setup = await specTask();
    const failing = new Proxy({}, { get: () => () => Promise.reject(new Error(CANARY)) }) as TaskSpecDao;
    const result = await rejection(callProcedure(specCaller(setup, setup.ownerId, failing), name, specInputs(setup)[name]));
    expect(result).toMatchObject({ code: "INTERNAL_SERVER_ERROR", reason: "service_unavailable" });
    expect(JSON.stringify(result)).not.toContain(CANARY);
  });
});
