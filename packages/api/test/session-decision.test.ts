import { afterEach, describe, expect, it } from "vitest";
import { rejection } from "./planning-support";
import { insertPendingRequest, openedFlowDevSession, requestRow } from "./session-interaction-support";
import { FREE_TEXT_LIMIT, decide } from "./session-request-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("tasks.session.decidePermission", () => {
  it("stores allow, and a deny with its reason", async () => {
    const world = await openedFlowDevSession();
    const allowed = await insertPendingRequest(world, "permission");
    await decide({ world, requestId: allowed.id, decision: "allow" });
    expect(await requestRow(world.setup, allowed.id)).toMatchObject({ status: "answered", answer: { decision: "allow" } });
    const denied = await insertPendingRequest(world, "permission");
    await decide({ world, requestId: denied.id, decision: "deny", reason: "Não apague o build, só rode o lint" });
    expect((await requestRow(world.setup, denied.id)).answer).toEqual({ decision: "deny", reason: "Não apague o build, só rode o lint" });
  });

  it("V-22d records allow_always without taking any rule from the caller", async () => {
    const world = await openedFlowDevSession();
    const request = await insertPendingRequest(world, "permission");
    await decide({ world, requestId: request.id, decision: "allow_always", reason: "Bash(rm -rf:*)" });
    expect((await requestRow(world.setup, request.id)).answer).toEqual({ decision: "allow_always" });
  });

  it("V-22d refuses allow_always without a suggested rule and a reason over 2000 characters", async () => {
    const world = await openedFlowDevSession();
    const bare = await insertPendingRequest(world, "permission", { toolName: "Bash", title: "t", body: "b", truncated: false, suggestedRule: null, suggestions: [] });
    expect(await rejection(decide({ world, requestId: bare.id, decision: "allow_always" }))).toMatchObject({ code: "BAD_REQUEST", reason: "answer_invalid" });
    const request = await insertPendingRequest(world, "permission");
    expect(await rejection(decide({ world, requestId: request.id, decision: "deny", reason: "r".repeat(FREE_TEXT_LIMIT + 1) }))).toMatchObject({ reason: "answer_invalid" });
    expect((await requestRow(world.setup, bare.id)).status).toBe("pending");
    expect((await requestRow(world.setup, request.id)).status).toBe("pending");
  });

  it("V-23f refuses a second decision with request_answered", async () => {
    const world = await openedFlowDevSession();
    const request = await insertPendingRequest(world, "permission");
    await decide({ world, requestId: request.id, decision: "allow" });
    expect(await rejection(decide({ world, requestId: request.id, decision: "deny" }))).toMatchObject({ code: "CONFLICT", reason: "request_answered" });
    expect((await requestRow(world.setup, request.id)).answer).toEqual({ decision: "allow" });
  });
});
