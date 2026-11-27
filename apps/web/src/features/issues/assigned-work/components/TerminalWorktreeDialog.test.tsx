import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { ISSUE_41_BRANCH, approvedDetail } from "@/test/tasks";
import { CHECKOUT_PATH, preflightOf } from "@/test/terminal";
import type { WorktreeFolderPreview, WorktreePreview } from "../worktreeContract";
import { TerminalLaunchAction } from "./TerminalLaunchAction";

const preflight = vi.mocked(trpc.tasks.terminal.preflight.query);
const ACTION = { name: "Iniciar sessão" };
const WORKTREE_PATH = "/home/ana/Área de trabalho/shop-worktrees/issue-41";
const DIRTY_CHECKOUT = { path: CHECKOUT_PATH, branch: "main", detachedSha: null, dirty: true };

function folder(patch: Partial<WorktreeFolderPreview> = {}): WorktreeFolderPreview {
  return { mode: "worktree", path: WORKTREE_PATH, branch: ISSUE_41_BRANCH, detachedSha: null, state: "ready", dirty: false, busyPath: null, ...patch };
}

async function dialogWith(worktree: WorktreePreview) {
  preflight.mockResolvedValue(preflightOf({ checkout: DIRTY_CHECKOUT, worktree }));
  render(<TerminalLaunchAction detail={approvedDetail()} onOpened={vi.fn()} />);
  await userEvent.click(screen.getByRole("button", ACTION));
  const dialog = await screen.findByRole("dialog", { name: "Iniciar sessão" });
  await within(dialog).findByLabelText("Prompt");
  return { dialog, confirm: within(dialog).getByRole("button", ACTION) as HTMLButtonElement };
}

describe("TerminalLaunchDialog with a worktree", () => {
  it("V-W20 shows the worktree that will be created and warns that uncommitted changes stay behind", async () => {
    const { dialog, confirm } = await dialogWith(folder({ state: "create" }));
    expect(within(dialog).getByText(WORKTREE_PATH)).toBeTruthy();
    expect(within(dialog).getByText(`Branch: ${ISSUE_41_BRANCH}`)).toBeTruthy();
    expect(within(dialog).getByText("O worktree será criado agora, na branch nova flow/issue-41, a partir da branch main da pasta configurada.")).toBeTruthy();
    expect(within(dialog).getByText("As mudanças não commitadas da pasta configurada não vão para o worktree.")).toBeTruthy();
    expect(within(dialog).queryByText(CHECKOUT_PATH)).toBeNull();
    expect(confirm.disabled).toBe(false);
  });

  it("V-W20 warns before recreating a removed branch from the configured folder", async () => {
    const { dialog } = await dialogWith(folder({ state: "restore_branch" }));
    expect(within(dialog).getByText("A branch flow/issue-41 não existe mais. Ela será criada de novo a partir da branch main da pasta configurada.")).toBeTruthy();
  });

  it("V-W21 blocks the confirmation when the place of the worktree is taken", async () => {
    const { dialog, confirm } = await dialogWith(folder({ state: "branch_busy", busyPath: CHECKOUT_PATH }));
    expect(within(dialog).getByRole("alert").textContent).toBe(`A branch flow/issue-41 está em uso em ${CHECKOUT_PATH}. Troque a branch dessa pasta para iniciar a sessão.`);
    expect(confirm.disabled).toBe(true);
  });

  it("V-W21 blocks the confirmation while the work has no choice", async () => {
    const { dialog, confirm } = await dialogWith({ mode: null });
    expect(within(dialog).getByText("Escolha onde trabalhar, com ou sem worktree, na etapa Planejamento antes de iniciar a primeira sessão.")).toBeTruthy();
    expect(confirm.disabled).toBe(true);
  });
});
