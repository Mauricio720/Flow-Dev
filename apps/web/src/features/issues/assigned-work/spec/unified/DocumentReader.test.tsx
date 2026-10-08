import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DocumentReader } from "./DocumentReader";
import { readDocument } from "./documentModel";
import { openPoints } from "./openPoints";

const SOURCE = `---
status: pending
---
# Documento legível

## Executive Summary

Uma introdução com **decisão importante** e [fonte](https://example.com).

## Goals

- Primeiro item
- Segundo item com \`código\`

| Campo | Valor |
| --- | --- |
| Estado | Pronto |

<script>alert("nunca")</script>

## Open Questions

Confirmar o primitive. O submit continua no fluxo hospedeiro.

## API Endpoints

Não aplicável: nenhuma API muda.`;

const read = (source = SOURCE) => readDocument({ id: "spec", label: "Spec", path: "_spec.md", source });

describe("DocumentReader", () => {
  it("renders a readable document instead of exposing Markdown syntax", () => {
    const { container } = render(<DocumentReader document={read()} onOpenDocument={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Documento legível" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Resumo executivo" })).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Objetivos" })).getByRole("list")).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByRole("link", { name: "fonte" })).toHaveProperty("href", "https://example.com/");
    expect(screen.getByText(/<script>alert/)).toBeTruthy();
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).not.toContain("# Documento");
    expect(container.textContent).not.toContain("---");
    expect(screen.getByText("pending")).toBeTruthy();
  });

  it("groups sections with nothing to change and keeps the captured text one click away", async () => {
    render(<DocumentReader document={read()} onOpenDocument={vi.fn()} />);
    expect(screen.getByText("Sem mudanças nesta entrega: Endpoints de API")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Endpoints de API" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Ver texto original" }));
    expect(screen.getByLabelText("Texto original do documento").textContent).toContain("## Executive Summary");
  });

  it("keeps a paragraph that asks something as one point and leaves plain notes out", () => {
    expect(openPoints([read()])).toEqual([]);
    const asking = "## Open Questions\n\nO submit continua no fluxo hospedeiro? Hoje ele é local.\n\nOs comentários da issue não puderam ser consultados.";
    expect(openPoints([read(asking)]).map((point) => point.text)).toEqual(["O submit continua no fluxo hospedeiro? Hoje ele é local."]);
  });

  it("asks for no confirmation when nothing is open, on premises or on unrelated sections", () => {
    const settled = "## Questões em aberto\n\nNenhuma decisão está pendente. As escolhas estão no ADR.\n\n## Premissas e defaults\n\n- Estado inicial não ocupado.\n\n## Ordem de construção e dependências\n\n1. Linha de base.";
    expect(openPoints([read(settled)])).toEqual([]);
  });

  it("confirms each listed question once", () => {
    const listed = "## Open Questions\n\n- Manter a espera de 2000 ms? Hoje ela é fixa.\n- Quem aprova o texto?";
    expect(openPoints([read(listed)]).map((point) => point.text)).toEqual(["Manter a espera de 2000 ms? Hoje ela é fixa.", "Quem aprova o texto?"]);
  });

  it("keeps each titled question whole, with its alternatives as detail", () => {
    const titled = "## Perguntas abertas\n\n### Q1 — Quando bloquear a tela?\n\nEnviada ao autor. Timeout não é resposta.\n\n1. Skeletons\n2. Remover overlays\n\n### Q2 — Manter a espera?\n\nSem decisão local.";
    const points = openPoints([read(titled)]);
    expect(points.map((point) => point.text)).toEqual(["Q1 — Quando bloquear a tela?", "Q2 — Manter a espera?"]);
    expect(points.map((point) => point.detail.map((token) => token.type))).toEqual([["paragraph", "list"], ["paragraph"]]);
  });

  it("keeps unsafe links inert and delegates package-document links", async () => {
    const onOpenDocument = vi.fn();
    render(<DocumentReader document={read("[interno](_dx.md) e [inseguro](javascript:alert(1))")} onOpenDocument={onOpenDocument} />);
    await userEvent.click(screen.getByRole("button", { name: "interno" }));
    expect(onOpenDocument).toHaveBeenCalledWith("_dx.md");
    expect(screen.queryByRole("link", { name: "inseguro" })).toBeNull();
    expect(screen.queryByRole("button", { name: "inseguro" })).toBeNull();
  });
});
