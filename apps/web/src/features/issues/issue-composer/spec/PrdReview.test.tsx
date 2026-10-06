import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PRD_SOURCE, STORIES_SOURCE, documentOf, packageOf } from "@/test/spec";
import { PrdReview } from "./PrdReview";

const encoder = new TextEncoder();
const span = (text: string, source: string) => ({ startByte: encoder.encode(source.slice(0, source.indexOf(text))).length, endByte: encoder.encode(source.slice(0, source.indexOf(text) + text.length)).length });
const noop = () => undefined;
const stories = [{ id: "US-001", title: "Exportar", source: span("### US-001", STORIES_SOURCE), acceptance: [{ id: "US-001.AC-1", source: span("- AC-1: Given um relatório, when exportar, then baixa o CSV.", STORIES_SOURCE) }], edges: [{ id: "US-001.EC-1", source: span("- EC-1: relatório vazio → arquivo com cabeçalho.", STORIES_SOURCE) }] }];

describe("PrdReview", () => {
  it("UT-047 links US-001 to its full acceptance criteria and EC-1 source content", () => {
    const detail = packageOf({ relations: { stories, tests: [], tasks: [] } as never });
    render(<PrdReview detail={detail} documents={[documentOf("_prd.md", PRD_SOURCE), documentOf("_user_stories.md", STORIES_SOURCE)]} onOpenDocument={noop} onLoadMore={noop} />);
    const list = screen.getByRole("list", { name: "Histórias de usuário" });
    expect(within(list).getByText(/US-001 · Exportar/)).toBeTruthy();
    expect(list.textContent).toContain("when exportar, then baixa o CSV");
    expect(list.textContent).toContain("relatório vazio → arquivo com cabeçalho");
  });

  it("UT-048 shows an incomplete-package state when _user_stories.md is missing", () => {
    render(<PrdReview detail={packageOf()} documents={[documentOf("_prd.md", PRD_SOURCE)]} onOpenDocument={noop} onLoadMore={noop} />);
    expect(screen.getByRole("alert").textContent).toContain("Pacote incompleto");
  });

  it("IT-227 keeps an unknown heading and its whole requirement under an additional section", () => {
    render(<PrdReview detail={packageOf({ relations: { stories, tests: [], tasks: [] } as never })} documents={[documentOf("_prd.md", PRD_SOURCE), documentOf("_user_stories.md", STORIES_SOURCE)]} onOpenDocument={noop} onLoadMore={noop} />);
    const extra = screen.getByRole("region", { name: "Additional constraints" });
    expect(extra.textContent).toContain("Seção adicional");
    expect(extra.textContent).toContain("O arquivo MUST expirar.");
  });

  it("IT-051 renders active HTML as inert text and shows the blocking diagnostic", () => {
    const html = "# PRD\n\n## Overview\n\n<script>alert(1)</script>\n";
    const diagnostics = [{ code: "interpretation_gap", severity: "blocking", documentId: "_prd.md", blockId: "b3", message: "Conteúdo material sem bloco representado" }];
    render(<PrdReview detail={packageOf({ diagnostics, relations: { stories, tests: [], tasks: [] } as never })} documents={[documentOf("_prd.md", html), documentOf("_user_stories.md", STORIES_SOURCE)]} onOpenDocument={noop} onLoadMore={noop} />);
    expect(document.querySelector("script")).toBeNull();
    expect(screen.getByText("<script>alert(1)</script>")).toBeTruthy();
    expect(screen.getByRole("list", { name: "Diagnósticos do pacote" }).textContent).toContain("interpretation_gap");
  });

  it("IT-053 keeps 100,000 source bytes reachable through bounded block pages", () => {
    const big = documentOf("_prd.md", `# PRD\n\n## Overview\n\n${"a".repeat(100_000)}\n`);
    const paged = { ...big, blocks: big.blocks.slice(0, 2), totalBlocks: big.blocks.length, nextCursor: "next" };
    const onLoadMore = vi.fn();
    render(<PrdReview detail={packageOf()} documents={[paged, documentOf("_user_stories.md", STORIES_SOURCE)]} onOpenDocument={noop} onLoadMore={onLoadMore} />);
    fireEvent.click(screen.getByRole("button", { name: /Carregar mais blocos de _prd.md/ }));
    expect(onLoadMore).toHaveBeenCalledWith(big.id);
  });

  it("IT-060 reaches the final of 200 stories through stable navigation", () => {
    const many = Array.from({ length: 200 }, (_, index) => ({ ...stories[0]!, id: `US-${String(index + 1).padStart(3, "0")}`, title: `História ${index + 1}` }));
    render(<PrdReview detail={packageOf({ relations: { stories: many, tests: [], tasks: [] } as never })} documents={[documentOf("_prd.md", PRD_SOURCE), documentOf("_user_stories.md", STORIES_SOURCE)]} onOpenDocument={noop} onLoadMore={noop} />);
    expect(screen.getByText(/US-200 · História 200/)).toBeTruthy();
  });
});
