import { act, render, screen } from "@testing-library/react";
import { IssueComposer } from "@/features/issues/issue-composer";
import type { WorkspaceLoad } from "@/features/issues/issue-composer/contract";
import { CART_PROJECT } from "./tasks";

export function renderWorkspace(initial: WorkspaceLoad, canAuthor = true) {
  return render(<IssueComposer project={CART_PROJECT} initial={initial} canAuthor={canAuthor} />);
}

export async function recheck() {
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
}

export function publishButton() {
  return screen.getByRole<HTMLButtonElement>("button", { name: "Criar Issue" });
}

export function describedBy(element: HTMLElement) {
  const id = element.getAttribute("aria-describedby");
  return id ? (document.getElementById(id)?.textContent ?? "") : "";
}

export function statusRegion() {
  return screen.getByRole("status", { name: "Estado da tarefa" });
}
