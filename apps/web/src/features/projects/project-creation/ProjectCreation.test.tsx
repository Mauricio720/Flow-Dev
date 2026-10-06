import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { ACME_PRIVATE, P1, candidateOf, candidatePage, deferred, projectConflict } from "@/test/projects";
import { creationDraftStore } from "./creationDraft";
import { ProjectCreation } from "./index";

const NAME_MAX = 60;
const DESCRIPTION_MAX = 280;
const candidates = vi.mocked(trpc.projects.repositoryCandidates.query);
const preview = vi.mocked(trpc.projects.repositoryPreview.query);
const create = vi.mocked(trpc.projects.create.mutate);

afterEach(() => creationDraftStore.clear());

async function reviewedForm() {
  candidates.mockResolvedValue(candidatePage([candidateOf(ACME_PRIVATE)]));
  preview.mockResolvedValue(candidateOf(ACME_PRIVATE));
  render(<ProjectCreation notice={null} />);
  await userEvent.click(await screen.findByRole("button", { name: "Selecionar acme/private" }));
  await screen.findByText("O GitHub confirmou agora o acesso da sua conta e a identidade atual deste repositório.");
  return { name: screen.getByLabelText<HTMLInputElement>("Nome do projeto"), description: screen.getByLabelText<HTMLTextAreaElement>("Descrição (opcional)"), submit: screen.getByRole("button", { name: "Criar projeto" }) };
}

async function fill(field: HTMLElement, value: string) {
  await userEvent.clear(field);
  if (value) await userEvent.type(field, value);
}

describe("project creation form", () => {
  it("UT-039 creates once from the reviewed repository with an empty description sent as null", async () => {
    const answer = deferred<typeof P1>();
    create.mockReturnValue(answer.promise);
    const form = await reviewedForm();
    await fill(form.name, "Alpha");
    await userEvent.click(form.submit);
    await userEvent.click(form.submit);
    answer.resolve(P1);
    await waitFor(() => expect(useRouter().push).toHaveBeenCalledWith("/projects?criado=1"));
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({ name: "Alpha", description: null, nodeId: "R_202" });
    expect(preview).toHaveBeenCalledWith({ nodeId: "R_202" });
  });

  it("UT-040 links to the existing project on a repository conflict and keeps the fields", async () => {
    create.mockRejectedValue(projectConflict("repository", "p1"));
    const form = await reviewedForm();
    await fill(form.name, "Alpha");
    await fill(form.description, "Loja principal");
    await userEvent.click(form.submit);
    expect((await screen.findByRole("link", { name: "Abrir projeto existente" })).getAttribute("href")).toBe("/projects/p1");
    expect(form.name.value).toBe("Alpha");
    expect(form.description.value).toBe("Loja principal");
    expect(useRouter().push).not.toHaveBeenCalled();
  });

  it("UT-008 rejects a blank or 61-character name on the field and accepts 2 and 60 after trim", async () => {
    create.mockResolvedValue(P1);
    const form = await reviewedForm();
    for (const name of [" ", "n".repeat(NAME_MAX + 1)]) {
      await fill(form.name, name);
      await userEvent.click(form.submit);
      expect(form.name.getAttribute("aria-invalid")).toBe("true");
    }
    expect(create).not.toHaveBeenCalled();
    for (const name of [" ab ", ` ${"n".repeat(NAME_MAX)} `]) {
      await fill(form.name, name);
      await userEvent.click(form.submit);
      await waitFor(() => expect(create).toHaveBeenLastCalledWith({ name: name.trim(), description: null, nodeId: "R_202" }));
    }
  });

  it("UT-009 accepts 280 description characters and rejects 281 on the field", async () => {
    create.mockResolvedValue(P1);
    const form = await reviewedForm();
    await fill(form.name, "Alpha");
    await userEvent.click(form.description);
    await userEvent.paste("d".repeat(DESCRIPTION_MAX + 1));
    await userEvent.click(form.submit);
    expect(form.description.getAttribute("aria-invalid")).toBe("true");
    expect(create).not.toHaveBeenCalled();
    await userEvent.type(form.description, "{backspace}");
    await userEvent.click(form.submit);
    await waitFor(() => expect(create).toHaveBeenCalledWith({ name: "Alpha", description: "d".repeat(DESCRIPTION_MAX), nodeId: "R_202" }));
  });

  it("does not offer creation for a repository whose review shows an existing project", async () => {
    candidates.mockResolvedValue(candidatePage([candidateOf(ACME_PRIVATE)]));
    preview.mockResolvedValue(candidateOf(ACME_PRIVATE, "p1"));
    render(<ProjectCreation notice={null} />);
    await userEvent.click(await screen.findByRole("button", { name: "Selecionar acme/private" }));
    expect((await screen.findByRole("link", { name: "Abrir projeto existente" })).getAttribute("href")).toBe("/projects/p1");
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Criar projeto" }).disabled).toBe(true);
  });
});
