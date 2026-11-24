import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { approvedDetail } from "@/test/tasks";
import { AGENTS, CHECKOUT_PATH, OPUS_MAX, preflightOf } from "@/test/terminal";
import type { AgentOption } from "../terminalContract";
import { TerminalLaunchAction } from "./TerminalLaunchAction";

const preflight = vi.mocked(trpc.tasks.terminal.preflight.query);
const open = vi.mocked(trpc.tasks.terminal.open.mutate);
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
