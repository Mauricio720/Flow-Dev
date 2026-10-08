import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { P1, P2, pageOf, pendingForever, stateOf, trpcFailure } from "@/test/projects";
import type { CatalogLoad, CatalogViewer } from "./catalogState";
import { ProjectCatalog } from "./index";

const MEMBER: CatalogViewer = { isAdmin: false, lastProjectId: null };
const ADMIN: CatalogViewer = { isAdmin: true, lastProjectId: null };
const EMPTY_STATE_TITLES = /Seu espaço ainda está vazio|Nenhum projeto criado ainda|Nenhum projeto encontrado|Sem projetos/;
const list = vi.mocked(trpc.projects.list.query);
const states = vi.mocked(trpc.projects.connectionStates.query);

function renderCatalog(initial: CatalogLoad, viewer = MEMBER) {
  states.mockImplementation(() => pendingForever());
  return render(<ProjectCatalog initial={initial} viewer={viewer} notice={null} />);
}

function entries() {
  return within(screen.getByRole("list", { name: "Projetos disponíveis" })).getAllByRole("link");
}

describe("project catalog", () => {
  it("UT-035 shows the project, acme/private and the checking label before GitHub answers", () => {
    renderCatalog({ kind: "ready", page: pageOf([P1]) });
    const entry = screen.getByRole("link", { name: "Projeto Alfa acme/private" });
    expect(within(entry).getByText("Verificando acesso")).toBeTruthy();
    expect(states).toHaveBeenCalledWith({ projectIds: ["p1"] });
  });

  it("replaces the checking label with each project's own state", async () => {
    states.mockResolvedValue([stateOf("p1", "authorization_needed"), stateOf("p2", "available")]);
    render(<ProjectCatalog initial={{ kind: "ready", page: pageOf([P1, P2]) }} viewer={MEMBER} notice={null} />);
    expect(await screen.findByText("Autorização do GitHub necessária")).toBeTruthy();
    expect(screen.getByText("Repositório disponível")).toBeTruthy();
  });

  it("UT-036 offers a retry for a failed list and never an empty state", async () => {
    renderCatalog({ kind: "failed" });
    expect(screen.queryByText(EMPTY_STATE_TITLES)).toBeNull();
    list.mockResolvedValue(pageOf([P1]));
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("link", { name: "Projeto Alfa acme/private" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Tentar novamente" })).toBeNull();
  });

  it("UT-002 shows a project repeated by a later page once, with one destination", async () => {
    renderCatalog({ kind: "ready", page: pageOf([P1], "cursor-2") });
    list.mockResolvedValue(pageOf([P1, P2]));
    await userEvent.click(screen.getByRole("button", { name: "Carregar mais projetos" }));
    await screen.findByRole("link", { name: "Projeto Docs octo/docs" });
    expect(entries().map((entry) => entry.getAttribute("href"))).toEqual(["/projects/p1/work", "/projects/p2/work"]);
    expect(list).toHaveBeenCalledWith({ search: undefined, cursor: "cursor-2" });
  });

  it("searches by project or repository and explains a search without matches", async () => {
    renderCatalog({ kind: "ready", page: pageOf([P1]) });
    list.mockResolvedValue(pageOf([]));
    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar por projeto ou repositório" }), "octo/docs");
    expect(await screen.findByRole("heading", { name: "Nenhum projeto encontrado" })).toBeTruthy();
    expect(list).toHaveBeenLastCalledWith({ search: "octo/docs", cursor: undefined });
    expect(screen.queryByText("Seu espaço ainda está vazio")).toBeNull();
  });

  it("tells an unassigned developer and an administrator apart when nothing is visible", () => {
    renderCatalog({ kind: "ready", page: pageOf([]) }).unmount();
    renderCatalog({ kind: "ready", page: pageOf([]) }, ADMIN);
    expect(screen.getByRole("heading", { name: "Nenhum projeto criado ainda" })).toBeTruthy();
    expect(screen.queryByText("Seu espaço ainda está vazio")).toBeNull();
  });

  it("UT-010 shows a Portuguese no-access state without any issue creation shortcut", () => {
    renderCatalog({ kind: "ready", page: pageOf([]) });
    expect(screen.getByRole("heading", { name: "Seu espaço ainda está vazio" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Criar projeto|Nova intenção|Criar Issue/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Criar|Nova intenção/ })).toBeNull();
  });

  it("opens the overview for an administrator and the assigned work for everyone else", () => {
    renderCatalog({ kind: "ready", page: pageOf([P1]) }, ADMIN);
    expect(entries().map((entry) => entry.getAttribute("href"))).toEqual(["/projects/p1"]);
  });

  it("clears private names and asks for sign-in when the session expires", async () => {
    renderCatalog({ kind: "ready", page: pageOf([P1], "cursor-2") });
    list.mockRejectedValue(trpcFailure("UNAUTHORIZED"));
    await userEvent.click(screen.getByRole("button", { name: "Carregar mais projetos" }));
    await waitFor(() => expect(useRouter().replace).toHaveBeenCalledWith("/login?erro=sessao_expirada&next=%2Fprojects"));
    expect(screen.queryByText("Projeto Alfa")).toBeNull();
  });
});
