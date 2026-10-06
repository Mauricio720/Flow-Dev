import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { serveTask } from "@/test/taskApi";
import { detailOf, fileSource, issueSource, loadOf, revisionOf } from "@/test/tasks";
import { renderWorkspace } from "@/test/workspaceHarness";
import type { SourceReference } from "../contract";
import { draftSources } from "../draftSources";
import { SourcesPanel } from "./SourcesPanel";
import { ToolRun } from "./ToolRun";

const EMPTY_LOOKUP = { toolCallId: "call-1", operationId: "op-1", tool: "searchProject" as const, target: "total do carrinho", status: "empty" as const, reason: null, durationMs: 12, sequence: 1 };
const SOURCE_COUNT = 100;

function panelFor(references: SourceReference[], evidenceBindings: unknown[] = []) {
  return render(<SourcesPanel activity={[]} sources={draftSources(revisionOf({ references }, { evidenceBindings }))} hasDraft />);
}

describe("sources and consultation activity", () => {
  it("UT-055 shows a stored empty lookup with its measured time and no found file", () => {
    render(<ToolRun calls={[EMPTY_LOOKUP]} />);
    const rows = within(screen.getByRole("list", { name: "Consultas registradas" })).getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toBe("searchProjecttotal do carrinhonada encontrado12ms");
    expect(screen.getByText(/Contexto consultado · 1 chamada/)).toBeTruthy();
  });

  it("UT-056 shows a validation error for an unsafe source URL and no active link", () => {
    panelFor([{ ...fileSource(), url: "javascript:alert(1)" }, { ...issueSource(), url: "https://evil.example/acme/cart/issues/41" }]);
    expect(screen.getAllByRole("alert").map((alert) => alert.textContent)).toEqual(Array(2).fill("Fonte não validada: o endereço registrado não é um link seguro do GitHub e foi desativado."));
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("src/cart.ts:10")).toBeTruthy();
  });

  it("UT-132 shows no filler path, Issue or timing when nothing was consulted or cited", () => {
    render(<SourcesPanel activity={[]} sources={[]} hasDraft />);
    expect(screen.getByText("Nenhuma consulta foi registrada nesta tarefa.")).toBeTruthy();
    expect(screen.getByText("O draft atual não cita fontes.")).toBeTruthy();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByRole("complementary").textContent).not.toMatch(/\d+ms|#\d+|\.tsx?/);
  });

  it("UT-133 keeps every one of 100 references reachable", () => {
    panelFor(Array.from({ length: SOURCE_COUNT }, (_, index) => fileSource(`src/modules/file-${index}.ts`, index + 1)));
    const links = screen.getAllByRole("link");
    expect(new Set(links.map((link) => link.getAttribute("href"))).size).toBe(SOURCE_COUNT);
    expect(screen.getByRole("link", { name: "Abrir src/modules/file-99.ts:100 no GitHub" }).getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("UT-134 keeps recorded provenance labeled historical with opening guidance", () => {
    panelFor([issueSource()], [{ evidenceId: "e1", fieldPath: "references.0", claimHash: "h", verification: "historical" }]);
    const entry = within(screen.getByRole("list", { name: "Fontes do draft" })).getByRole("listitem");
    expect(entry.textContent).toContain("acme/cart#41");
    expect(entry.textContent).toContain("Histórica");
    expect(entry.textContent).toContain("Se o link não abrir, a fonte pode ter sido movida ou removida no GitHub");
    expect(within(entry).getByRole("link").getAttribute("href")).toBe("https://github.com/acme/cart/issues/41");
  });

  it("UT-145 returns focus to the sources trigger after the drawer closes", async () => {
    const detail = detailOf({ currentRevision: revisionOf({ references: [fileSource()] }) });
    serveTask(detail);
    renderWorkspace(loadOf(detail));
    const trigger = screen.getByRole("button", { name: "Fontes" });
    await userEvent.click(trigger);
    const drawer = await screen.findByRole("dialog", { name: "Fontes e contexto consultado" });
    expect(within(drawer).getByRole("link", { name: "Abrir src/cart.ts:10 no GitHub" })).toBeTruthy();
    await userEvent.click(within(drawer).getByRole("button", { name: "Fechar fontes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("UT-070 labels the publication snapshot as the planning basis without inventing lookups", () => {
    render(<SourcesPanel activity={[]} sources={[]} hasDraft planningBasis={41} />);
    expect(screen.getByRole("region", { name: "Base do planejamento" }).textContent).toContain("snapshot da Issue publicada (#41)");
    expect(screen.getByText("Nenhuma consulta foi registrada nesta tarefa.")).toBeTruthy();
    expect(screen.queryByText(/ms$/)).toBeNull();
  });
});
