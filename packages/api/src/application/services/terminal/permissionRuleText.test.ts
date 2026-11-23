import { describe, expect, it } from "vitest";
import { suggestedRuleOf } from "./permissionRuleText";

const bashRule = (ruleContent?: string) => ({ type: "addRules", behavior: "allow", destination: "localSettings", rules: [{ toolName: "Bash", ...(ruleContent ? { ruleContent } : {}) }] });

describe("suggestedRuleOf", () => {
  it("writes a content rule the way the Claude Code settings file does", () => {
    expect(suggestedRuleOf([bashRule("pnpm test:*")])).toBe("Bash(pnpm test:*)");
  });

  it("writes only the tool name for a rule without content", () => {
    expect(suggestedRuleOf([bashRule()])).toBe("Bash");
  });

  it("returns null with no suggestion or with suggestions that do not allow a rule", () => {
    expect(suggestedRuleOf([])).toBeNull();
    expect(suggestedRuleOf([{ type: "setMode", mode: "acceptEdits" }, { ...bashRule("x"), behavior: "deny" }])).toBeNull();
  });

  it("uses the first suggestion that adds an allow rule", () => {
    expect(suggestedRuleOf([{ type: "addDirectories", directories: ["/tmp"] }, bashRule("a"), bashRule("b")])).toBe("Bash(a)");
  });
});
