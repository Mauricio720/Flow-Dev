import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { serveTask, taskApi } from "@/test/taskApi";
import { detailOf, loadOf, revisionOf, summaryOf } from "@/test/tasks";
import { renderWorkspace } from "@/test/workspaceHarness";
import type { IssueDraft } from "../contract";
import { proposalFields } from "../refinementModel";
import { HistoryEntry } from "./HistoryEntry";

function openDraft(labels: IssueDraft["labels"]) {
  const detail = detailOf({ currentRevision: revisionOf({ labels }) });
  serveTask(detail);
  renderWorkspace(loadOf(detail));
  return within(screen.getByRole("article", { name: "Draft da issue" }));
}

describe("LabelsEditor", () => {
  it("shows the labels classified for the draft", () => {
    expect(openDraft(["frontend", "backend"]).getByRole("list", { name: "Labels" }).textContent).toBe("frontendbackend");
  });

  it("saves the labels chosen by the author in catalog order", async () => {
    const draft = openDraft(["backend"]);
    await userEvent.click(draft.getByRole("button", { name: "Editar" }));
    expect(draft.getByRole("button", { name: "backend" }).getAttribute("aria-pressed")).toBe("true");
    await userEvent.click(draft.getByRole("button", { name: "frontend" }));
    taskApi.saveDraft.mutate.mockRejectedValue(new TypeError("Failed to fetch"));
    await userEvent.click(draft.getByRole("button", { name: "Salvar" }));
    expect(taskApi.saveDraft.mutate.mock.calls[0][0]).toMatchObject({ draft: { labels: ["frontend", "backend"] } });
  });

  it("unmarks a label that is chosen again", async () => {
    const draft = openDraft(["docs"]);
    await userEvent.click(draft.getByRole("button", { name: "Editar" }));
    await userEvent.click(draft.getByRole("button", { name: "docs" }));
    expect(draft.getByRole("button", { name: "docs" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("never offers the labels as a refinement proposal", () => {
    const current = revisionOf({ labels: ["frontend"] }).draft;
    expect(proposalFields(current, { ...current, labels: ["backend"], title: "Novo título" }, []).map((field) => field.path)).toEqual(["title"]);
  });

  it("shows the labels of a task in the history", () => {
    render(<ul><HistoryEntry task={summaryOf({ labels: ["infra"] })} active={false} onSelect={vi.fn()} /></ul>);
    expect(screen.getByRole("list", { name: "Labels" }).textContent).toBe("infra");
  });
});
