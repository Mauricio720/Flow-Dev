import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { ACME_PRIVATE, OCTO_DOCS, candidateOf, candidatePage, trpcFailure } from "@/test/projects";
import { creationDraftStore } from "./creationDraft";
import { ProjectCreation } from "./index";

const candidates = vi.mocked(trpc.projects.repositoryCandidates.query);
const preview = vi.mocked(trpc.projects.repositoryPreview.query);

afterEach(() => creationDraftStore.clear());

describe("repository picker", () => {
  it("UT-006 shows a field error for an unsafe direct reference without asking GitHub", async () => {
    candidates.mockResolvedValue(candidatePage([]));
    render(<ProjectCreation notice={null} />);
    const field = screen.getByLabelText("Não achou na lista? Informe owner/nome");
    for (const reference of ["https://evil.example/acme/private", "acme/"]) {
      await userEvent.clear(field);
      await userEvent.type(field, reference);
      await userEvent.click(screen.getByRole("button", { name: "Verificar repositório" }));
      expect(field.getAttribute("aria-invalid")).toBe("true");
    }
    expect(preview).not.toHaveBeenCalled();
  });

  it("UT-007 tells a batch without matches apart from the end of the search", async () => {
    candidates.mockResolvedValueOnce(candidatePage([], "Mg")).mockResolvedValueOnce(candidatePage([]));
    render(<ProjectCreation notice={null} />);
    const proceed = await screen.findByRole("button", { name: "Continuar busca" });
    expect(screen.queryByRole("heading", { name: "Nenhum resultado" })).toBeNull();
    await userEvent.click(proceed);
    expect(await screen.findByRole("heading", { name: "Nenhum resultado" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Continuar busca" })).toBeNull();
    expect(candidates).toHaveBeenLastCalledWith({ search: undefined, cursor: "Mg" });
  });

  it("UT-037 marks a linked candidate and disables its selection", async () => {
    candidates.mockResolvedValue(candidatePage([candidateOf(ACME_PRIVATE, "p1"), candidateOf(OCTO_DOCS)]));
    render(<ProjectCreation notice={null} />);
    expect(await screen.findByText("Já vinculado")).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Selecionar acme/private" }).disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Selecionar octo/docs" }).disabled).toBe(false);
    expect(screen.getByRole("link", { name: "Abrir projeto" }).getAttribute("href")).toBe("/projects/p1");
  });

  it("UT-038 keeps the search term and the draft and offers a retry after a rate limit", async () => {
    candidates.mockResolvedValueOnce(candidatePage([candidateOf(OCTO_DOCS)])).mockRejectedValueOnce(trpcFailure("TOO_MANY_REQUESTS")).mockResolvedValueOnce(candidatePage([candidateOf(ACME_PRIVATE)]));
    render(<ProjectCreation notice={null} />);
    await userEvent.type(screen.getByLabelText("Nome do projeto"), "Alpha");
    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar repositório" }), "acme");
    expect(await screen.findByRole("heading", { name: "O GitHub limitou as consultas" })).toBeTruthy();
    expect(screen.getByRole<HTMLInputElement>("searchbox", { name: "Buscar repositório" }).value).toBe("acme");
    expect(screen.getByLabelText<HTMLInputElement>("Nome do projeto").value).toBe("Alpha");
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("button", { name: "Selecionar acme/private" })).toBeTruthy();
    expect(candidates).toHaveBeenLastCalledWith({ search: "acme", cursor: undefined });
  });

  it("explains the separate GitHub authorization before showing any repository", async () => {
    candidates.mockRejectedValue(trpcFailure("PRECONDITION_FAILED"));
    render(<ProjectCreation notice={null} />);
    const authorize = await screen.findByRole("button", { name: "Autorizar repositórios no GitHub" });
    expect(authorize.closest("form")?.getAttribute("action")).toBe("/api/github-repositories/connect?returnTo=%2Fprojects%2Fnew");
    await waitFor(() => expect(screen.queryByRole("list", { name: "Repositórios acessíveis" })).toBeNull());
  });
});
