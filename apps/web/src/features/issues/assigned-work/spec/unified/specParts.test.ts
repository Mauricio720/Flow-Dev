import { describe, expect, it } from "vitest";
import { splitSpecParts } from "./specParts";

describe("splitSpecParts", () => {
  it("splits one _spec.md into its Product and Technical parts", () => {
    const parts = splitSpecParts("# Spec\n\n## Product\n\nQuem usa.\n\n## Technical\n\nComo funciona.\n");
    expect(parts.map((part) => part.id)).toEqual(["product", "technical"]);
    expect(parts[0]?.text).toContain("Quem usa.");
    expect(parts[1]?.text).toContain("Como funciona.");
    expect(parts[0]?.text).not.toContain("Como funciona.");
  });

  it("ignores deeper headings that merely mention a part name", () => {
    const parts = splitSpecParts("# Part I — Product\n\n## High-Level Technical Constraints\n\nA\n\n# Part II — Technical\n\n### Technical Dependencies\n\nB\n");
    expect(parts.map((part) => part.id)).toEqual(["product", "technical"]);
    expect(parts[0]?.text).toContain("High-Level Technical Constraints");
  });

  it("returns the whole document when no part heading exists", () => {
    expect(splitSpecParts("# Livre\n\ntexto")).toEqual([{ id: "document", title: "Documento", text: "# Livre\n\ntexto" }]);
  });
});
