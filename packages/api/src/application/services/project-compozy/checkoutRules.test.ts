import { describe, expect, it } from "vitest";
import { evaluateCheckout, matchesProjectRemote, normalizeRemote, validateCheckoutPath } from "./checkoutRules";

const project = { owner: "acme", name: "meu-app" };

describe("checkout rules", () => {
  it.each(["projetos/app", "", "   ", "./app"])("UT-001 rejects the non absolute path %j", (value) => {
    expect(() => validateCheckoutPath(value)).toThrowError(expect.objectContaining({ reason: "checkout_path_not_absolute" }));
  });

  it("UT-001 normalizes an absolute path with accents, spaces and a trailing slash", () => {
    expect(validateCheckoutPath(" /home/mauricio/Área de trabalho/app/ ")).toBe("/home/mauricio/Área de trabalho/app");
  });

  it("UT-004 matches SSH and HTTPS remotes without .git or case differences", () => {
    expect(matchesProjectRemote(["git@github.com:Acme/Meu-App.git"], project)).toBe(true);
    expect(matchesProjectRemote(["https://github.com/ACME/meu-app"], project)).toBe(true);
    expect(matchesProjectRemote(["ssh://git@github.com/acme/meu-app.git"], project)).toBe(true);
    expect(matchesProjectRemote(["https://github.com/acme/outro.git"], project)).toBe(false);
    expect(matchesProjectRemote([], project)).toBe(false);
  });

  it("UT-004 ignores remotes without an owner and repository path", () => {
    expect(normalizeRemote("/srv/git/meu-app.git")).toBeNull();
    expect(normalizeRemote("not a remote")).toBeNull();
  });

  it("checks the project remote before the default branch", () => {
    expect(evaluateCheckout({ root: "/r", remotes: ["https://github.com/acme/outro"], defaultBranch: null }, project)).toMatchObject({ ready: false, failureCode: "checkout_remote_mismatch" });
    expect(evaluateCheckout({ root: "/r", remotes: ["git@github.com:acme/meu-app.git"], defaultBranch: null }, project)).toMatchObject({ ready: false, failureCode: "default_branch_unknown" });
    expect(evaluateCheckout({ root: "/r", remotes: ["git@github.com:acme/meu-app.git"], defaultBranch: "main" }, project)).toEqual({ ready: true, root: "/r", defaultBranch: "main" });
  });
});
