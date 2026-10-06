import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { previewOf, publicationApi, serveTask, taskApi } from "@/test/taskApi";
import { P, R7, R8, T, detailOf, fileSource, issueSource, loadOf, revisionOf, summaryOf } from "@/test/tasks";
import { recheck, renderWorkspace } from "@/test/workspaceHarness";
import type { IssueDraft, TaskDetail } from "../contract";

const FULL_DRAFT: Partial<IssueDraft> = {
  constraints: ["Não alterar o cálculo de frete"],
  relevantContext: [{ statement: "O total é recalculado em cartTotal", source: fileSource() }],
  productConsiderations: ["Mostrar o total antigo riscado"],
  references: [issueSource()],
};
const BODY = "## Contexto\n\nAo remover item o total permanece antigo\n\n## Objetivo\n\nRecalcular total";
const COLLECTION_SIZE = 100;

function openDraft(draft: Partial<IssueDraft> = {}, patch: Partial<TaskDetail> = {}) {
  const detail = detailOf({ currentRevision: revisionOf(draft), ...patch });
  serveTask(detail);
  renderWorkspace(loadOf(detail));
  return within(screen.getByRole("article", { name: "Draft da issue" }));
}

function field(name: string) {
  return screen.getByRole<HTMLTextAreaElement>("textbox", { name });
}

describe("IssueDraftBlock", () => {
  it("UT-053 shows the seven canonical fields and the title and body preview for acme/cart", async () => {
    const draft = openDraft(FULL_DRAFT);
    ["Título", "Contexto", "Objetivo", "Restrições", "Contexto relevante", "Considerações de produto", "Referências"].forEach((label) => expect(draft.getByText(label)).toBeTruthy());
    ["Corrigir total", "Recalcular total", "Não alterar o cálculo de frete", "src/cart.ts:10", "Mostrar o total antigo riscado", "acme/cart#41"].forEach((value) => expect(draft.getByText(value)).toBeTruthy());
    publicationApi.preview.query.mockResolvedValue(previewOf(R7, BODY));
    await userEvent.click(draft.getByRole("button", { name: "Revisar publicação" }));
    const preview = within(await draft.findByRole("region", { name: "Prévia da publicação" }));
    expect(publicationApi.preview.query).toHaveBeenCalledExactlyOnceWith({ projectId: P, taskId: T, revisionId: R7 });
    expect(preview.getByText("acme/cart")).toBeTruthy();
    expect(preview.getByText("@ana")).toBeTruthy();
    expect(preview.getByLabelText("Corpo da Issue em Markdown").textContent).toBe(BODY);
    expect(within(preview.getByRole("group", { name: "Corpo da Issue renderizado" })).getAllByRole("heading").map((heading) => heading.textContent)).toEqual(["Contexto", "Objetivo"]);
  });

  it("UT-137 keeps 100 constraints and 100 source entries editable and reachable", async () => {
    const constraints = Array.from({ length: COLLECTION_SIZE }, (_, index) => `Restrição original ${index + 1}`);
    const references = Array.from({ length: COLLECTION_SIZE }, (_, index) => fileSource(`src/file-${index}.ts`, index + 1));
    const draft = openDraft({ constraints, references });
    fireEvent.click(draft.getByText("Editar"));
    expect(draft.getAllByLabelText(/^Restrição \d+$/)).toHaveLength(COLLECTION_SIZE);
    expect(draft.getAllByLabelText(/^Remover referência \d+$/)).toHaveLength(COLLECTION_SIZE);
    fireEvent.change(draft.getByLabelText("Restrição 100"), { target: { value: "Restrição original 100 revisada" } });
    expect(draft.getByLabelText<HTMLInputElement>("Restrição 100").value).toBe("Restrição original 100 revisada");
    expect(draft.getByLabelText<HTMLInputElement>("Restrição 1").value).toBe("Restrição original 1");
    fireEvent.click(draft.getByLabelText("Remover referência 100"));
    expect(draft.getAllByLabelText(/^Remover referência \d+$/)).toHaveLength(COLLECTION_SIZE - 1);
    expect(draft.getByText("Adicionar restrição").closest("button")?.disabled).toBe(true);
    expect(draft.getByText("Salvar")).toBeTruthy();
  });

  it("UT-140 identifies a blank objective with an accessible field alert and keeps the values", async () => {
    const draft = openDraft({ objective: "   " });
    await userEvent.click(draft.getByRole("button", { name: "Editar" }));
    await userEvent.click(draft.getByRole("button", { name: "Revisar publicação" }));
    const alert = draft.getByRole("alert");
    expect(alert.textContent).toBe("Objetivo é obrigatório para publicar.");
    expect(field("Objetivo").getAttribute("aria-invalid")).toBe("true");
    expect(field("Objetivo").getAttribute("aria-describedby")).toBe(alert.id);
    expect(field("Objetivo").value).toBe("   ");
    expect(field("Título").value).toBe("Corrigir total");
    expect(publicationApi.preview.query).not.toHaveBeenCalled();
  });

  it("UT-135 shows a failed, unconfirmed save without discarding the local content", async () => {
    const draft = openDraft();
    await userEvent.click(draft.getByRole("button", { name: "Editar" }));
    await userEvent.type(field("Objetivo"), " ao remover item");
    taskApi.saveDraft.mutate.mockRejectedValue(new TypeError("Failed to fetch"));
    await userEvent.click(draft.getByRole("button", { name: "Salvar" }));
    expect((await draft.findByRole("alert")).textContent).toContain("As alterações continuam aqui e ainda não foram salvas");
    expect(field("Objetivo").value).toBe("Recalcular total ao remover item");
    expect(draft.getByRole("button", { name: "Salvar" })).toBeTruthy();
    expect(taskApi.saveDraft.mutate.mock.calls[0][0]).toMatchObject({ projectId: P, taskId: T, expectedVersion: 7, baseRevisionId: R7, draft: { objective: "Recalcular total ao remover item" } });
  });

  it("UT-143 keeps focus and the dirty input when a poll brings a newer revision", async () => {
    const draft = openDraft();
    await userEvent.click(draft.getByRole("button", { name: "Editar" }));
    await userEvent.type(field("Objetivo"), " hoje");
    taskApi.byId.query.mockResolvedValue(detailOf({ task: summaryOf({ version: 8 }), currentRevision: revisionOf({ objective: "Recalcular total e frete" }, { id: R8, revisionNumber: 8 }) }));
    await recheck();
    await waitFor(() => expect(draft.getByRole("alert").textContent).toContain("Existe uma revisão mais recente"));
    expect(field("Objetivo").value).toBe("Recalcular total hoje");
    expect(document.activeElement).toBe(field("Objetivo"));
    await userEvent.click(draft.getByRole("button", { name: "Carregar a revisão mais recente" }));
    expect(field("Objetivo").value).toBe("Recalcular total e frete");
  });
});
