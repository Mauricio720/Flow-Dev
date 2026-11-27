import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { ISSUE_41_BRANCH, NOW, P, T, approvedDetail } from "@/test/tasks";
import { terminalRejection } from "@/test/terminal";
import type { WorktreeChoice } from "../worktreeContract";
import { WorktreeChoiceSection } from "./WorktreeChoiceSection";

const choose = vi.mocked(trpc.tasks.worktree.choose.mutate);
const NO_CHOICE: WorktreeChoice = { mode: null, locked: false, branch: ISSUE_41_BRANCH, chosenAt: null };
const SAVE = { name: "Salvar escolha" };

function detailWith(worktree: WorktreeChoice) {
  return { ...approvedDetail(), worktree };
}

describe("Onde trabalhar", () => {
  it("V-W18 asks the operator to choose, explains the worktree and saves the choice", async () => {
    choose.mockResolvedValue({ mode: "worktree", locked: false, branch: ISSUE_41_BRANCH, chosenAt: NOW });
    const onSaved = vi.fn();
    render(<WorktreeChoiceSection detail={detailWith(NO_CHOICE)} canChoose onSaved={onSaved} />);
    expect(screen.getByText("Escolha onde trabalhar antes de iniciar a primeira sessão.")).toBeTruthy();
    expect((screen.getByRole("button", SAVE) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("radio", { name: /Com worktree.*Cria a branch flow\/issue-41 e uma pasta só deste trabalho ao lado do clone/ })).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: /Com worktree/ }));
    await userEvent.click(screen.getByRole("button", SAVE));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(choose).toHaveBeenCalledWith({ projectId: P, taskId: T, mode: "worktree" });
  });

  it("V-W18 shows the reason when the choice can no longer change", async () => {
    choose.mockRejectedValue(terminalRejection("worktree_choice_locked", "A escolha de worktree fica fixa depois que a primeira sessão do trabalho abre.", "CONFLICT"));
    const onSaved = vi.fn();
    render(<WorktreeChoiceSection detail={detailWith({ ...NO_CHOICE, mode: "checkout", chosenAt: NOW })} canChoose onSaved={onSaved} />);
    await userEvent.click(screen.getByRole("radio", { name: /Com worktree/ }));
    await userEvent.click(screen.getByRole("button", SAVE));
    expect((await screen.findByRole("alert")).textContent).toBe("A escolha de worktree fica fixa depois que a primeira sessão do trabalho abre.");
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("V-W19 shows a fixed choice with its branch and no controls after the first session", () => {
    render(<WorktreeChoiceSection detail={detailWith({ mode: "worktree", locked: true, branch: ISSUE_41_BRANCH, chosenAt: NOW })} canChoose onSaved={vi.fn()} />);
    expect(screen.getByText("Com worktree", { exact: false })).toBeTruthy();
    expect(screen.getByText(ISSUE_41_BRANCH)).toBeTruthy();
    expect(screen.getByText("A escolha fica fixa depois que a primeira sessão abre.")).toBeTruthy();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("V-W19 lets readers see the choice but never change it", () => {
    const { rerender } = render(<WorktreeChoiceSection detail={detailWith(NO_CHOICE)} canChoose={false} onSaved={vi.fn()} />);
    expect(screen.getByText("A pessoa operadora ainda não escolheu onde trabalhar.")).toBeTruthy();
    rerender(<WorktreeChoiceSection detail={detailWith({ ...NO_CHOICE, mode: "checkout", chosenAt: NOW })} canChoose={false} onSaved={vi.fn()} />);
    expect(screen.getByText("Sem worktree")).toBeTruthy();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByRole("button", SAVE)).toBeNull();
  });
});
