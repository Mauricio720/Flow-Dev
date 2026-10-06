import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { deferred } from "@/test/projects";
import { previewOf, publicationApi, serveTask, taskApi } from "@/test/taskApi";
import { DRAFT, O, P, R7, R8, T, detailOf, loadOf, revisionOf, summaryOf } from "@/test/tasks";
import { describedBy, publishButton, renderWorkspace } from "@/test/workspaceHarness";
import type { TaskDetail } from "../contract";

const PROPOSAL = { operationId: O, draft: { ...DRAFT, title: "Corrigir total do carrinho" }, baseRevisionId: R7 };
const SAVED_R8 = detailOf({ task: summaryOf({ version: 8 }), currentRevision: revisionOf({ objective: "Recalcular total sempre" }, { id: R8, revisionNumber: 8 }) });

function openReview(patch: Partial<TaskDetail> = {}) {
  const detail = detailOf(patch);
  serveTask(detail);
  renderWorkspace(loadOf(detail));
  return within(screen.getByRole("article", { name: "Draft da issue" }));
}

async function editObjective(text: string) {
  await userEvent.click(screen.getByRole("button", { name: "Editar" }));
  await userEvent.type(screen.getByRole("textbox", { name: "Objetivo" }), text);
}

describe("DraftFooter", () => {
  it("UT-054 disables Criar Issue for a dirty objective and explains the pending save", async () => {
    openReview();
    await editObjective(" sempre");
    expect(publishButton().disabled).toBe(true);
    expect(describedBy(publishButton())).toBe("Há alterações não salvas. Salve o draft para liberar a criação da Issue.");
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Revisar publicação" }).disabled).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Descartar alterações" }));
    expect(describedBy(publishButton())).toContain("Revise a publicação");
  });

  it("UT-104 blocks publication until the pending proposal is applied or discarded and confirmed", async () => {
    const draft = openReview({ pendingProposal: PROPOSAL });
    const resolution = deferred<unknown>();
    taskApi.resolveRefinement.mutate.mockReturnValue(resolution.promise as never);
    expect(describedBy(publishButton())).toBe("Aplique ou descarte a proposta de refinamento antes de criar a Issue.");
    expect(draft.getByRole<HTMLInputElement>("checkbox", { name: "Aplicar Título" }).checked).toBe(true);
    await userEvent.click(draft.getByRole("button", { name: "Aplicar selecionados" }));
    expect(taskApi.resolveRefinement.mutate.mock.calls[0][0]).toMatchObject({ projectId: P, taskId: T, expectedVersion: 7, proposalOperationId: O, decision: "apply", selectedPaths: ["title"] });
    expect(publishButton().disabled).toBe(true);
    taskApi.byId.query.mockResolvedValue(detailOf({ task: summaryOf({ version: 8, title: PROPOSAL.draft.title }), currentRevision: revisionOf({ title: PROPOSAL.draft.title }, { id: R8 }) }));
    await act(async () => resolution.resolve({ version: 8 }));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Proposta de refinamento" })).toBeNull());
    expect(describedBy(publishButton())).toContain("Revise a publicação");
  });

  it("UT-136 keeps approval unavailable while Save is pending and until the saved content is reviewed", async () => {
    openReview();
    await editObjective(" sempre");
    const saving = deferred<never>();
    taskApi.saveDraft.mutate.mockReturnValue(saving.promise);
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByRole("status", { name: "" }).textContent).toBe("Salvando…");
    expect(describedBy(publishButton())).toBe("Aguarde o salvamento terminar para criar a Issue.");
    await userEvent.click(publishButton());
    expect(publicationApi.publish.mutate).not.toHaveBeenCalled();
    taskApi.byId.query.mockResolvedValue(SAVED_R8);
    await act(async () => saving.resolve(undefined as never));
    await waitFor(() => expect(describedBy(publishButton())).toContain("Revise a publicação"));
    publicationApi.preview.query.mockResolvedValue(previewOf(R8, "## Objetivo\n\nRecalcular total sempre"));
    await userEvent.click(screen.getByRole("button", { name: "Revisar publicação" }));
    await waitFor(() => expect(publishButton().disabled).toBe(false));
    expect(screen.getByText("Publicação revisada. Confira a prévia acima e crie a Issue.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Revisar de novo" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Revisar publicação" })).toBeNull();
    publicationApi.publish.mutate.mockResolvedValue({ status: "publishing" });
    await userEvent.click(publishButton());
    expect(publicationApi.publish.mutate.mock.calls[0][0]).toMatchObject({ projectId: P, taskId: T, revisionId: R8, repositoryId: "202", previewHash: "h7", expectedVersion: 8 });
  });

  it("preserves edits made after a save request starts", async () => {
    openReview();
    await editObjective(" sempre");
    const saving = deferred<unknown>();
    taskApi.saveDraft.mutate.mockReturnValue(saving.promise as never);
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Contexto" }), " fiscal");
    taskApi.byId.query.mockResolvedValue(SAVED_R8);
    await act(async () => saving.resolve(undefined));
    await waitFor(() => expect(screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Contexto" }).value).toBe("Ao remover item o total permanece antigo fiscal"));
  });
});
