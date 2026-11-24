import { describe, expect, it, vi } from "vitest";
import type { RuntimeStartInput } from "../../../application/terminal/agentSessionRuntime";
import { CodexSessionRequestBridge } from "./codexSessionRequestBridge";
import type { ItemStartedParams } from "./protocol/codexMethods";

const FILE_APPROVAL = "item/fileChange/requestApproval";
const CHANGED_PATH = "src/novo.ts";
const approval = { threadId: "t", turnId: "u", itemId: "item-file", startedAtMs: 1 };
const fileItem = { threadId: "t", turnId: "u", startedAtMs: 1, item: { id: "item-file", type: "fileChange", status: "inProgress", changes: [{ path: CHANGED_PATH, kind: { type: "add" }, diff: "+novo" }] } } as ItemStartedParams;

function bridge() {
  const onPermission = vi.fn(async (_request: unknown) => ({ behavior: "allow" as const }));
  const input = { sessionId: "s", cwd: "/clone", prompt: "p", contextDir: "/context", permissionMode: "ask_all", handlers: { onPermission } } as unknown as RuntimeStartInput;
  return { onPermission, bridge: new CodexSessionRequestBridge(input, { info: () => undefined, error: () => undefined }, () => undefined) };
}

describe("CodexSessionRequestBridge file changes", () => {
  it("attaches the changes of the started item to its approval request", async () => {
    const { bridge: target, onPermission } = bridge();
    target.track("item/started", fileItem);
    await target.answer(FILE_APPROVAL, approval);
    expect(onPermission.mock.calls[0]![0]).toMatchObject({ toolName: "fileChange", input: { diff: expect.stringContaining(CHANGED_PATH) } });
  });

  it("forgets the changes once the item completes", async () => {
    const { bridge: target, onPermission } = bridge();
    target.track("item/started", fileItem);
    target.track("item/completed", fileItem);
    await target.answer(FILE_APPROVAL, approval);
    expect(JSON.stringify(onPermission.mock.calls[0]![0])).not.toContain(CHANGED_PATH);
  });
});
