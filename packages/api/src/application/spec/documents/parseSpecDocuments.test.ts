import { describe, expect, it } from "vitest";
import { checkBlockCoverage } from "./blockCoverage";
import { parseSpecDocuments } from "./parseSpecDocuments";
import { buildSections, diagramDiagnostic } from "./specReviewModel";
import { sha256Hex } from "../../services/spec/specPayload";

const parse = (text: string | Buffer, path = "_prd.md") => parseSpecDocuments([{ path, role: "prd", bytes: Buffer.isBuffer(text) ? text : Buffer.from(text, "utf8") }])[0]!;

describe("parseSpecDocuments", () => {
  it("UT-021 retains complete ordered source spans for headings, tables and code", () => {
    const source = "# Título\n\nTexto com **ênfase**.\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n```ts\nconst x = 1;\n```\n\n- item\n";
    const document = parse(source);
    expect(document.blocks.map((block) => block.kind)).toEqual(["heading", "prose", "table", "code", "list"]);
    expect(document.diagnostics.filter((item) => item.severity === "blocking")).toEqual([]);
    for (let index = 1; index < document.blocks.length; index += 1) expect(document.blocks[index]!.startByte).toBeGreaterThanOrEqual(document.blocks[index - 1]!.endByte);
  });

  it("UT-022 produces a blocking diagnostic for invalid UTF-8 and for uncovered material source", () => {
    const invalid = parse(Buffer.from([0x23, 0x20, 0xc3, 0x28]));
    expect(invalid.diagnostics).toEqual([expect.objectContaining({ code: "invalid_utf8", severity: "blocking" })]);
    const bytes = Buffer.from("# A\n\nmaterial perdido\n\n## B\n", "utf8");
    const blocks = parse(bytes).blocks.filter((block) => block.content !== "material perdido");
    expect(checkBlockCoverage(bytes, blocks, "_prd.md")).toEqual([expect.objectContaining({ code: "interpretation_gap", severity: "blocking" })]);
  });

  it("UT-033 slices accented UTF-8 blocks to exactly the original bytes", () => {
    const source = "# Ação rápida\n\nPão, café e maçã — ✓ 😀\n";
    const bytes = Buffer.from(source, "utf8");
    const document = parse(bytes);
    for (const block of document.blocks) {
      const slice = bytes.subarray(block.startByte, block.endByte);
      expect(slice.toString("utf8")).toBe(block.content);
      expect(sha256Hex(slice)).toBe(block.sourceHash);
    }
    expect(document.blocks[1]!.endByte).toBeGreaterThan(document.blocks[1]!.content.length);
  });

  it("UT-034 reports out-of-range and overlapping spans as interpretation gaps", () => {
    const bytes = Buffer.from("# A\n\ntexto\n", "utf8");
    const [first, second] = parse(bytes).blocks as [ReturnType<typeof parse>["blocks"][number], ReturnType<typeof parse>["blocks"][number]];
    expect(checkBlockCoverage(bytes, [{ ...first, endByte: 999 }], "d")[0]?.code).toBe("interpretation_gap");
    expect(checkBlockCoverage(bytes, [first, { ...second, startByte: 1 }], "d").some((item) => item.message.includes("sobreposto"))).toBe(true);
  });

  it("IT-051 keeps raw HTML as inert source text and flags unrepresented material", () => {
    const document = parse("# Doc\n\n<script>alert(1)</script>\n\ntexto\n");
    const html = document.blocks.find((block) => block.content.includes("<script>"))!;
    expect(html.kind).toBe("prose");
    expect(document.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: "raw_html_inert", severity: "observation" })]));
  });

  it("IT-227 preserves an unknown safe heading and its whole requirement under additional sections", () => {
    const document = parse("# PRD\n\n## Overview\n\nok\n\n## Additional constraints\n\nThe export MUST finish in 5 seconds.\n\n- detalhe\n");
    const sections = buildSections(document.blocks, ["Overview"]);
    const extra = sections.find((section) => section.title === "Additional constraints")!;
    expect(extra.known).toBe(false);
    expect(extra.blockIds.map((id) => document.blocks.find((block) => block.id === id)!.content).join("\n")).toContain("MUST finish in 5 seconds");
  });

  it("parses task frontmatter as an inert code block", () => {
    const document = parse("---\nstatus: pending\ntitle: X\n---\n\n# Task 01: X\n", "task_01.md");
    expect(document.blocks[0]).toMatchObject({ kind: "code" });
    expect(document.diagnostics).toEqual([]);
  });

  it("IT-061 flags diagrams with external links or scripts as render gaps", () => {
    const [diagram] = parse("```mermaid\ngraph TD\nA-->B\nclick A \"javascript:alert(1)\"\n```\n").blocks;
    expect(diagram!.kind).toBe("diagram");
    expect(diagramDiagnostic(diagram!)).toMatchObject({ code: "diagram_render_gap", severity: "blocking" });
    expect(diagramDiagnostic(parse("```mermaid\ngraph TD\nA-->B\n```\n").blocks[0]!)).toBeNull();
  });
});
