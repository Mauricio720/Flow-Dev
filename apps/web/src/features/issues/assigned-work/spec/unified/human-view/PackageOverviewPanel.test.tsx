import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { packageOf } from "@/test/taskFlow";
import { openPoints } from "../openPoints";
import { PackageDocumentView } from "../PackageDocumentView";
import type { ReaderTab } from "../packageReader";
import { packageProjection } from "./packageOverview";
import { fullTabs } from "./viewFixtures";

const NEXT = { text: "Revise esta versão e aprove para liberar a criação das tarefas.", toApproval: true };
const CHANGES = { previousVersion: 1, changes: [{ kind: "decision" as const, type: "added" as const, title: "D5 — Retenção" }] };

function renderView(tabs: ReaderTab[] = fullTabs()) {
  const projection = packageProjection(packageOf({ version: 2 }), tabs, openPoints(tabs.flatMap((tab) => tab.documents)));
  return render(<PackageDocumentView tabs={tabs} projection={projection} next={NEXT} changes={CHANGES} artifactLabel="Spec v2" />);
}

const selectedTab = (list: string) => within(screen.getByRole("tablist", { name: list })).getByRole("tab", { selected: true }).textContent;

describe("package human view", () => {
  it("opens on the overview with the next step, version changes and verifiable origins", async () => {
    renderView();
    expect(selectedTab("Visões do pacote")).toBe("Visão geral");
    expect(within(screen.getByRole("region", { name: "Próximo passo" })).getByRole("link", { name: "Ir para a aprovação" })).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Mudanças desde a versão anterior (v1)" })).getByText("D5 — Retenção")).toBeTruthy();
    expect(screen.getAllByText(/Spec v2 ·/).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByText(/Avisos da leitura estruturada/));
    expect(screen.getByText(/cita US-009/)).toBeTruthy();
  });

  it("lays the PRD out by section and says when a section is not specified", async () => {
    renderView();
    await userEvent.click(screen.getByRole("tab", { name: "PRD" }));
    const nav = screen.getByRole("navigation", { name: "Seções do PRD" });
    expect(within(nav).getAllByRole("button").map((button) => button.textContent)).toEqual(["Resumo", "Jornadas1", "Requisitos1", "Personas1", "Decisões4", "Métricas0", "Riscos2", "Documento original"]);
    await userEvent.click(within(nav).getByRole("button", { name: /Métricas/ }));
    expect(screen.getByText("Não especificado neste documento.")).toBeTruthy();
    await userEvent.click(within(nav).getByRole("button", { name: /Jornadas/ }));
    expect(screen.getByText("Abre o painel com as cinco recentes.")).toBeTruthy();
  });

  it("takes a capability to its requirement detail with criteria and linked tests", async () => {
    renderView();
    await userEvent.click(screen.getByRole("button", { name: "Ver história US-001" }));
    expect(selectedTab("Visões do pacote")).toBe("PRD");
    expect(document.activeElement?.id).toBe("hv-US-001");
    expect(within(document.activeElement as HTMLElement).getByText("E2E-001, IT-009")).toBeTruthy();
  });

  it("shows the technical view with the declared diagram and contracts split into parts", async () => {
    renderView();
    await userEvent.click(screen.getByRole("tab", { name: "Tech Spec" }));
    expect(within(screen.getByRole("list", { name: "Camadas do diagrama" })).getByText("segue para notification (consulta), Sino")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Contratos/ }));
    await userEvent.click(screen.getByRole("button", { name: "Exemplos" }));
    expect(screen.getByText("await api.notification.summary();")).toBeTruthy();
  });

  it("keeps the original document one switch away and points origins at the exact section", async () => {
    renderView();
    await userEvent.click(within(screen.getByRole("region", { name: "Decisões" })).getByRole("button", { name: "Mais 1 registrada no documento" }));
    await userEvent.click(screen.getAllByRole("button", { name: "Produto · PRD › Decisões confirmadas pelo autor" })[0]!);
    expect(selectedTab("Visões do pacote")).toBe("Documento original");
    expect(selectedTab("Documentos do pacote")).toBe("Produto · PRD");
    expect(document.activeElement?.textContent).toBe("Decisões confirmadas pelo autor");
  });

  it("opens a long source section that was collapsed", async () => {
    const longRisks = "- Risco registrado com detalhe suficiente para a seção ficar longa.\n".repeat(14);
    renderView(fullTabs(`# Spec\n\n## Product\n\n## Visão\n\nTexto.\n\n## Technical\n\n## Riscos conhecidos\n\n${longRisks}`));
    await userEvent.click(within(screen.getByRole("region", { name: "Riscos e pontos de atenção" })).getAllByRole("button", { name: "Técnica · Tech Spec › Riscos conhecidos" })[0]!);
    expect(screen.getByRole("button", { name: "Recolher seção" })).toBeTruthy();
  });
});
