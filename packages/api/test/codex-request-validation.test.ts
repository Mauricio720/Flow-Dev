import { afterEach, describe, expect, it } from "vitest";
import { DrizzleSessionRequestDao } from "../src/infra/database/dao/terminal/drizzleSessionRequestDao";
import { summarizePermissionRequest } from "../src/application/services/terminal/permissionRequestSummarizer";
import { TRUNCATION_MARKER } from "../src/application/services/terminal/sessionInteractionLimits";
import { rejection } from "./planning-support";
import { insertPendingRequest, openedFlowDevSession, requestRow } from "./session-interaction-support";
import { decide, answerQuestion } from "./session-request-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("Codex request validation", () => {
  it("refuses permission decisions the request did not offer and leaves it pending", async () => {
    const world = await openedFlowDevSession();
    const command = await insertPendingRequest(world, "permission", { toolName: "Bash", title: "Rodar comando:", body: "pnpm test", truncated: false, suggestedRule: "Bash(pnpm test:*)", suggestions: [], offers: ["allow", "deny"], alwaysScope: null });
    const extra = await new DrizzleSessionRequestDao(world.setup.database).insertRequest({ sessionId: world.scope.sessionId, kind: "extra_permission", toolUseId: "codex-extra", payload: { toolName: "extraPermission", permissionKind: "extra_permission", title: "Pedir permissão:", body: "rede", truncated: false, suggestedRule: null, suggestions: [], offers: ["allow", "deny"], alwaysScope: null } });
    expect(await rejection(decide({ world, requestId: command.id, decision: "allow_session" }))).toMatchObject({ code: "BAD_REQUEST", reason: "decision_not_offered" });
    expect(await rejection(decide({ world, requestId: extra.id, decision: "allow_always" }))).toMatchObject({ code: "BAD_REQUEST", reason: "decision_not_offered" });
    expect((await requestRow(world.setup, command.id)).status).toBe("pending");
    expect((await requestRow(world.setup, extra.id)).status).toBe("pending");
  });

  it("answers Codex questions by id, rejects invalid shape and honors allowOther", async () => {
    const world = await openedFlowDevSession();
    const questions = [{ id: "q-1", question: "Qual valor?", header: "Valor", options: [{ label: "A", description: "" }], multiSelect: false, secret: false, allowOther: false }, { id: "q-2", question: "Qual valor?", header: "Outro valor", options: [{ label: "B", description: "" }], multiSelect: false, secret: false, allowOther: true }];
    const request = await insertPendingRequest(world, "question", { questions });
    expect(await rejection(answerQuestion(world, request.id, { "q-1": { labels: ["A", "B"] }, "q-2": { labels: ["B"] } }))).toMatchObject({ code: "BAD_REQUEST", reason: "answer_invalid" });
    expect(await rejection(answerQuestion(world, request.id, { "q-1": { labels: [], other: "A" }, "q-2": { labels: ["B"] } }))).toMatchObject({ reason: "answer_invalid" });
    expect(await answerQuestion(world, request.id, { "q-1": { labels: ["A"] }, "q-2": { labels: [], other: "livre" } })).toMatchObject({ status: "answered" });
    expect((await requestRow(world.setup, request.id)).answer).toEqual({ answers: { "q-1": "A", "q-2": "livre" } });
  });

  it("enforces 2000-character refusal reasons and the 20000-character diff cap", async () => {
    const world = await openedFlowDevSession();
    const atLimit = await insertPendingRequest(world, "permission");
    await decide({ world, requestId: atLimit.id, decision: "deny", reason: "r".repeat(2_000) });
    const overLimit = await insertPendingRequest(world, "permission");
    expect(await rejection(decide({ world, requestId: overLimit.id, decision: "deny", reason: "r".repeat(2_001) }))).toMatchObject({ reason: "answer_invalid" });
    const exact = summarizePermissionRequest({ toolName: "fileChange", input: { diff: "x".repeat(20_000) }, cwd: "/work/shop" });
    const over = summarizePermissionRequest({ toolName: "fileChange", input: { diff: "x".repeat(20_001) }, cwd: "/work/shop" });
    expect(exact).toMatchObject({ truncated: false, body: "x".repeat(20_000) });
    expect(over).toMatchObject({ truncated: true });
    expect(over.body).toHaveLength(20_000);
    expect(over.body.endsWith(TRUNCATION_MARKER)).toBe(true);
    expect((await requestRow(world.setup, overLimit.id)).status).toBe("pending");
  });
});
