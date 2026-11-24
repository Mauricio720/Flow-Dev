import { describe, expect, it } from "vitest";
import { codexThreadOptions } from "./codexThreadOptions";

const CHOICE = { model: "gpt-6.1-sol", effort: "high" };

describe("Codex thread options", () => {
  it("maps all Flow permission modes to the confirmed approval and sandbox policies", () => {
    expect(codexThreadOptions({ cwd: "/clone", choice: CHOICE, permissionMode: "bypass" })).toMatchObject({ start: { approvalPolicy: "never", sandbox: "danger-full-access" }, resume: { approvalPolicy: "never", sandbox: "danger-full-access" } });
    for (const permissionMode of ["accept_edits", "ask_all"] as const) {
      const options = codexThreadOptions({ cwd: "/clone", choice: CHOICE, permissionMode });
      expect(options.start).toMatchObject({ approvalPolicy: "untrusted", sandbox: "workspace-write" });
      expect(options.resume).toMatchObject({ approvalPolicy: "untrusted", sandbox: "workspace-write" });
    }
  });

  it("retains model and effort for turns and configures the experimental question flag", () => {
    const options = codexThreadOptions({ cwd: "/clone", choice: CHOICE, permissionMode: "ask_all" });
    expect(options).toMatchObject({ start: { model: CHOICE.model, ephemeral: false, config: { features: { default_mode_request_user_input: true } } }, resume: { model: CHOICE.model, config: { features: { default_mode_request_user_input: true } } }, turn: CHOICE });
    expect(codexThreadOptions({ cwd: "/clone", choice: CHOICE, permissionMode: "bypass", requestUserInput: false }).start.config).toEqual({ features: { default_mode_request_user_input: false } });
  });
});
