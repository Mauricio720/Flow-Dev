import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { approvedDetail } from "@/test/tasks";
import { AGENTS, CHECKOUT_PATH, OPUS_MAX, preflightOf } from "@/test/terminal";
import { CODEX_B, WORK, chosen, defaultChoice, workAccountsOf } from "@/test/workAccounts";
import type { AgentOption } from "../terminalContract";
import { TerminalLaunchAction } from "./TerminalLaunchAction";
import { WorkAccountsScope } from "./WorkAccountsScope";
import { WorkAccountsSection } from "./WorkAccountsSection";

const preflight = vi.mocked(trpc.tasks.terminal.preflight.query);
const open = vi.mocked(trpc.tasks.terminal.open.mutate);
const getAccounts = vi.mocked(trpc.tasks.workAccounts.get.query);
const SPEC_PROMPT = "/flow-dev:spec-writer Escreva a spec da Issue abaixo e pare para minha revisão. Não implemente ainda.";
const CODEX: AgentOption = { agent: "codex", available: true, reason: null, models: ["gpt-6.1", "gpt-6.1-sol"], efforts: ["medium", "high"], modelOptions: [
  { id: "gpt-6.1", label: "GPT-6.1", isDefault: false, efforts: ["medium"], defaultEffort: "medium" },
  { id: "gpt-6.1-sol", label: "GPT-6.1 Sol", isDefault: true, efforts: ["medium", "high"], defaultEffort: "medium" },
] };

describe("TerminalLaunchAction route choice", () => {
  it("V-51e starts at Claude Code · Opus · Máximo and confirms a Codex route choice with the edited prompt", async () => {
    preflight.mockResolvedValue(preflightOf({ checkout: { path: CHECKOUT_PATH, branch: "main", detachedSha: null, dirty: false }, prompt: SPEC_PROMPT, choice: OPUS_MAX, agents: [AGENTS[0]!, CODEX] }));
    open.mockResolvedValue({ sessionId: "session-1", unavailableIssueImages: 0 });
    render(<TerminalLaunchAction detail={approvedDetail()} onOpened={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Iniciar sessão" }));
    const dialog = await screen.findByRole("dialog", { name: "Iniciar sessão" });
    const prompt = await within(dialog).findByLabelText("Prompt") as HTMLTextAreaElement;
    expect((within(dialog).getByLabelText("Modelo") as HTMLSelectElement).value).toBe("opus");
    expect((within(dialog).getByLabelText("Esforço") as HTMLSelectElement).value).toBe("max");
    expect((within(dialog).getByRole("radio", { name: "Claude Code" }) as HTMLInputElement).checked).toBe(true);
    await userEvent.type(prompt, " Nota editada.");
    await userEvent.click(within(dialog).getByRole("radio", { name: "Codex" }));
    await waitFor(() => expect(preflight).toHaveBeenLastCalledWith({ projectId: approvedDetail().task.projectId, taskId: approvedDetail().task.id, purpose: { kind: "route", choice: { agent: "codex", model: "gpt-6.1-sol", effort: "high" } } }));
    expect(prompt.value).toBe(`${SPEC_PROMPT} Nota editada.`);
    await userEvent.click(within(dialog).getByRole("button", { name: "Iniciar sessão" }));
    await waitFor(() => expect(open).toHaveBeenCalledOnce());
    expect(open.mock.calls[0]![0]).toMatchObject({ prompt: `${SPEC_PROMPT} Nota editada.`, purpose: { kind: "route", choice: { agent: "codex", model: "gpt-6.1-sol", effort: "high" } } });
  });
});

describe("V-11e account shown in the launch dialog", () => {
  async function openDialog() {
    preflight.mockResolvedValue(preflightOf({ prompt: SPEC_PROMPT, choice: OPUS_MAX, agents: [AGENTS[0]!, CODEX] }));
    getAccounts.mockResolvedValue(workAccountsOf({ choices: [chosen(WORK), defaultChoice("codex")], options: { claude: [WORK], codex: [CODEX_B] }, version: 1 }));
    render(<WorkAccountsScope taskId={approvedDetail().task.id} operate><WorkAccountsSection /><TerminalLaunchAction detail={approvedDetail()} onOpened={vi.fn()} /></WorkAccountsScope>);
    await screen.findByRole("combobox", { name: "Conta do Claude Code" });
    await userEvent.click(screen.getByRole("button", { name: "Iniciar sessão" }));
    const dialog = await screen.findByRole("dialog", { name: "Iniciar sessão" });
    await within(dialog).findByLabelText("Prompt");
    return dialog;
  }

  it("shows the Claude account of the work and follows the agent change to Codex", async () => {
    const dialog = await openDialog();
    expect(within(dialog).getByText("Conta: Trabalho")).toBeDefined();
    expect(within(dialog).getByRole("button", { name: "Trocar conta" })).toBeDefined();
    await userEvent.click(within(dialog).getByRole("radio", { name: "Codex" }));
    expect(await within(dialog).findByText("Conta: Login padrão desta máquina")).toBeDefined();
  });

  it("closes the dialog and moves the focus to the work account selector on Trocar conta", async () => {
    const dialog = await openDialog();
    await userEvent.click(within(dialog).getByRole("button", { name: "Trocar conta" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("combobox", { name: "Conta do Claude Code" })));
  });

  it("does not show an account line outside the operator's work accounts scope", async () => {
    preflight.mockResolvedValue(preflightOf({ prompt: SPEC_PROMPT, choice: OPUS_MAX }));
    render(<TerminalLaunchAction detail={approvedDetail()} onOpened={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Iniciar sessão" }));
    const dialog = await screen.findByRole("dialog", { name: "Iniciar sessão" });
    await within(dialog).findByLabelText("Prompt");
    expect(within(dialog).queryByText(/^Conta:/)).toBeNull();
  });
});

