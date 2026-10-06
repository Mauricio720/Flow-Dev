import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { taskSpecWorkflows } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { SPEC_COMMANDS, callProcedure, specInputs } from "./spec-calls";
import { rejection, specCaller, specScope, specTask, startInput } from "./spec-support";
import { fakeDeps } from "./spec-worker-support";
import { seedLoad, seedReviewPackage, startWorkflow } from "./spec-seed";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(closeTaskFixture);

describe("spec admission", () => {
  it("IT-013 returns spec_capacity when two attempts run and twenty are queued", async () => {
    const setup = await specTask();
    await seedLoad(setup, [...Array(2).fill("running"), ...Array(20).fill("queued")]);
    const result = await rejection(specCaller(setup).start(startInput(setup)));
    expect(result).toMatchObject({ code: "TOO_MANY_REQUESTS", reason: "spec_capacity", retryAfterSeconds: 30 });
    expect(await setup.database.select().from(taskSpecWorkflows)).toHaveLength(22);
  });

  it("claims no new attempt while two runtime slots are occupied, including human waits", async () => {
    const setup = await specTask();
    await seedLoad(setup, ["waiting", "running", "queued"]);
    const { deps } = fakeDeps(setup);
    await setup.database.execute(`UPDATE task_spec_attempts SET lease_expires_at = now() + interval '1 hour', lease_owner = 'other' WHERE state <> 'queued'` as never);
    expect(await deps.dao.claim({ owner: "w", now: new Date(), maxActive: 2 })).toBeNull();
    expect(await deps.dao.activeCount()).toBe(2);
    await setup.database.execute(`UPDATE task_spec_attempts SET state = 'failed' WHERE state = 'running'` as never);
    expect(await deps.dao.claim({ owner: "w", now: new Date(), maxActive: 2 })).toMatchObject({ state: "dispatching" });
  });

  it("IT-114 blocks retry when the author credential was revoked after the failure", async () => {
    const setup = await specTask();
    const started = await startWorkflow(setup);
    await setup.database.execute(`UPDATE task_spec_attempts SET state = 'failed'` as never);
    await setup.database.execute(`DELETE FROM github_repository_authorizations` as never);
    const input = { ...specScope(setup), requestKey: crypto.randomUUID(), expectedSpecVersion: 1, failedAttemptId: started.attemptId };
    expect(await rejection(specCaller(setup).retry(input))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "repository_authorization_needed" });
  });

  it("IT-236 never invokes an Issue, comment, pull request, push or board mutation", async () => {
    const setup = await specTask();
    const started = await startWorkflow(setup);
    const created = await seedReviewPackage(setup, started);
    const caller = specCaller(setup);
    for (const name of SPEC_COMMANDS.filter((command) => command !== "start")) {
      const inputs = specInputs(setup, { expectedSpecVersion: 1 });
      const call = { ...inputs[name], packageId: created.id, manifestHash: created.manifestHash, attemptId: started.attemptId, failedAttemptId: started.attemptId };
      await callProcedure(caller, name, call).catch(() => undefined);
    }
    const requests = setup.githubFetcher.mock.calls.map(([url, init]) => ({ url: String(url), method: init?.method ?? "GET", body: String(init?.body ?? "") }));
    expect(requests.length).toBeGreaterThan(0);
    for (const request of requests) {
      expect(request.method === "GET" || (request.method === "POST" && request.url.endsWith("/graphql") && !request.body.includes("mutation"))).toBe(true);
      expect(request.url).not.toMatch(/\/(issues|pulls|comments|git\/refs|commits)/);
    }
  });
});
