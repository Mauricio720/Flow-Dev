type RuleValue = { toolName?: unknown; ruleContent?: unknown };
type Suggestion = string | { type?: unknown; behavior?: unknown; rules?: RuleValue[] };

const ADD_RULES = "addRules";
const ALLOW = "allow";

export function suggestedRuleOf(suggestions: unknown[]): string | null {
  for (const candidate of suggestions as Suggestion[]) {
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
    if (typeof candidate === "string") continue;
    if (candidate.type !== ADD_RULES || candidate.behavior !== ALLOW) continue;
    const [rule] = candidate.rules ?? [];
    if (typeof rule?.toolName !== "string") continue;
    return typeof rule.ruleContent === "string" ? `${rule.toolName}(${rule.ruleContent})` : rule.toolName;
  }
  return null;
}
