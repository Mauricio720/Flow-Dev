import { describe, expect, it } from "vitest";
import { deletionErrorCopy, preservedArtifactsCopy } from "./copy";

describe("issue deletion copy", () => {
  it("UT-021 names preserved artifacts for absent or malformed references without revealing paths", () => {
    const copy = preservedArtifactsCopy();
    expect(copy).toContain("worktrees");
    expect(copy).toContain("branches");
    expect(copy).toContain("Pull Requests");
    expect(copy).not.toContain("/home/");
  });

  it("UT-023 replaces empty or credential-bearing provider details with safe Portuguese copy", () => {
    const secret = "token ghp_12345678901234567890 at /home/private/worktree";
    const generic = deletionErrorCopy(null, null);
    const credential = deletionErrorCopy("INTERNAL_SERVER_ERROR", secret);
    expect(generic).toContain("A issue permanece disponível");
    expect(credential).not.toContain("ghp_");
    expect(credential).not.toContain("/home/");
    expect(credential).not.toContain(secret);
  });
});
