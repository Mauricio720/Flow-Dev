import { createRef } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { AGENTS, CODEX_REASON, OPUS_MAX, preflightOf } from "@/test/terminal";
import { P, T } from "@/test/tasks";
import type { LaunchPurpose } from "../terminalContract";
import { TerminalLaunchDialog } from "./TerminalLaunchDialog";

const preflight = vi.mocked(trpc.tasks.terminal.preflight.query);
const open = vi.mocked(trpc.tasks.terminal.open.mutate);
const ITEM = "00000000-0000-4000-8000-0000000000d1";
const EXECUTION_PROMPT = "Implemente, nesta ordem, as tarefas docs/specs/login/task_01.md de docs/specs/login. Siga o \"Como executar\" do _tasks.md.";

async function openFor(purpose: LaunchPurpose, patch = {}) {
  preflight.mockResolvedValue(preflightOf({ prompt: EXECUTION_PROMPT, choice: OPUS_MAX, ...patch }));
  render(<TerminalLaunchDialog projectId={P} taskId={T} purpose={purpose} trigger={createRef<HTMLButtonElement>()} onClose={vi.fn()} onOpened={vi.fn()} />);
  const dialog = await screen.findByRole("dialog", { name: "Iniciar a sessão do plano" });
  await within(dialog).findByLabelText("Prompt");
  return dialog;
}

describe("TerminalLaunchDialog for a plan session", () => {
  it("V-40n shows the choice defined in the plan as text, with no agent, model or effort selector, and an editable prompt", async () => {
    const dialog = await openFor({ kind: "plan_item", planItemId: ITEM });
    expect(within(dialog).getByText("Claude Code · Opus · esforço Máximo (definido no plano)")).toBeTruthy();
    expect(within(dialog).queryByLabelText("Modelo")).toBeNull();
    expect(within(dialog).queryByLabelText("Esforço")).toBeNull();
    expect(within(dialog).queryByRole("radio", { name: /Claude Code|Codex/ })).toBeNull();
    const prompt = within(dialog).getByLabelText("Prompt") as HTMLTextAreaElement;
    expect(prompt.value).toBe(EXECUTION_PROMPT);
    expect(prompt.disabled).toBe(false);
    expect(preflight).toHaveBeenCalledWith({ projectId: P, taskId: T, purpose: { kind: "plan_item", planItemId: ITEM } });
  });

  it("V-40n opens with the item only, and with force when the person confirmed starting anyway", async () => {
    open.mockResolvedValue({ sessionId: "s1", unavailableIssueImages: 0 });
    const dialog = await openFor({ kind: "plan_item", planItemId: ITEM, force: true });
    await userEvent.click(within(dialog).getByRole("button", { name: "Iniciar sessão" }));
    await waitFor(() => expect(open).toHaveBeenCalledOnce());
    const sent = open.mock.calls[0]![0];
    expect(sent.purpose).toEqual({ kind: "plan_item", planItemId: ITEM, force: true });
  });

  it("V-40t shows why a Codex item cannot start and does not allow confirming", async () => {
    const dialog = await openFor({ kind: "plan_item", planItemId: ITEM }, { choice: { agent: "codex", model: "gpt-6.1-sol", effort: "high" }, agents: AGENTS });
    expect(within(dialog).getByRole("alert").textContent).toBe(CODEX_REASON);
    expect((within(dialog).getByRole("button", { name: "Iniciar sessão" }) as HTMLButtonElement).disabled).toBe(true);
    expect(open).not.toHaveBeenCalled();
  });
});
