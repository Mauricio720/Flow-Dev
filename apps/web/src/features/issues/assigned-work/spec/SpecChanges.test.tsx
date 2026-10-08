import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { documentOf, HASH1, HASH2 } from "@/test/spec";
import { SpecChanges, compareRevisions } from "./SpecChanges";

const previous = { manifestHash: HASH1, documents: [documentOf("_prd.md", "# PRD\n\nParágrafo Q mantido.\n\nParágrafo Q removido.\n")] };
const current = { manifestHash: HASH2, parentManifestHash: HASH1, documents: [documentOf("_prd.md", "# PRD\n\nParágrafo Q mantido.\n\nParágrafo P adicionado.\n")] };

describe("SpecChanges", () => {
  it("UT-053 reports the paragraph V2 added and the paragraph it removed", () => {
    render(<SpecChanges current={current} parent={previous} />);
    expect(screen.getByText(/Parágrafo P adicionado/)).toBeTruthy();
    expect(screen.getByText(/Parágrafo Q removido/)).toBeTruthy();
    expect(screen.queryByText(/Parágrafo Q mantido/)).toBeNull();
  });

  it("UT-054 refuses a comparison whose parent hash does not match instead of fabricating a summary", () => {
    render(<SpecChanges current={{ ...current, parentManifestHash: "c".repeat(64) }} parent={previous} />);
    expect(screen.getByRole("alert").textContent).toContain("A comparação foi recusada");
    expect(screen.queryByText(/Parágrafo P adicionado/)).toBeNull();
  });

  it("IT-090 compares only the parent/current pair even when 50 revisions exist", () => {
    const history = Array.from({ length: 50 }, (_, index) => ({ manifestHash: String(index).padStart(64, "0"), documents: [] }));
    expect(history).toHaveLength(50);
    expect(compareRevisions(current, previous)).toMatchObject({ kind: "diff" });
    expect(compareRevisions(current, null)).toEqual({ kind: "none" });
  });

  it("lists removed documents and states when nothing changed", () => {
    const result = compareRevisions({ manifestHash: HASH2, parentManifestHash: HASH1, documents: [] }, previous);
    expect(result).toMatchObject({ kind: "diff", changes: [{ path: "_prd.md" }] });
    render(<SpecChanges current={{ ...current, documents: previous.documents }} parent={previous} />);
    expect(screen.getByText("Nenhuma diferença nos documentos capturados.")).toBeTruthy();
  });
});
