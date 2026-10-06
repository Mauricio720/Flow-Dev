import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { serveTask, taskApi } from "@/test/taskApi";
import { detailOf, loadOf, revisionOf } from "@/test/tasks";
import { renderWorkspace } from "@/test/workspaceHarness";
import { proposalFields } from "../refinementModel";

function openDraft(priorityPoints: number | null) {
  const detail = detailOf({ currentRevision: revisionOf({ priorityPoints }) });
  serveTask(detail);
  renderWorkspace(loadOf(detail));
  return within(screen.getByRole("article", { name: "Draft da issue" }));
}

describe("PriorityPointsEditor", () => {
  it("shows a draft without priority points as unprioritized", () => {
    expect(openDraft(null).getByText("Sem prioridade.")).toBeTruthy();
  });

  it("saves the priority points chosen on the 1 to 5 scale", async () => {
    const draft = openDraft(null);
    await userEvent.click(draft.getByRole("button", { name: "Editar" }));
    await userEvent.click(draft.getByRole("button", { name: "Prioridade 4" }));
    expect(draft.getByRole("button", { name: "Prioridade 4" }).getAttribute("aria-pressed")).toBe("true");
    taskApi.saveDraft.mutate.mockRejectedValue(new TypeError("Failed to fetch"));
    await userEvent.click(draft.getByRole("button", { name: "Salvar" }));
    expect(taskApi.saveDraft.mutate.mock.calls[0][0]).toMatchObject({ draft: { priorityPoints: 4 } });
  });

  it("clears the priority points when the selected value is chosen again", async () => {
    const draft = openDraft(3);
    expect(draft.getByText("3 de 5 pontos")).toBeTruthy();
    await userEvent.click(draft.getByRole("button", { name: "Editar" }));
    await userEvent.click(draft.getByRole("button", { name: "Prioridade 3" }));
    expect(draft.getByRole("button", { name: "Prioridade 3" }).getAttribute("aria-pressed")).toBe("false");
    expect(draft.getByRole("button", { name: "Salvar" })).toBeTruthy();
  });

  it("never offers the priority points as a refinement proposal", () => {
    const current = revisionOf({ priorityPoints: 4 }).draft;
    expect(proposalFields(current, { ...current, priorityPoints: null, title: "Novo título" }, []).map((field) => field.path)).toEqual(["title"]);
  });
});
