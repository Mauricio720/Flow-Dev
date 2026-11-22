import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { approvedDetail } from "@/test/tasks";
import { DEFAULT_PROMPT, preflightOf, terminalRejection } from "@/test/terminal";
import { TerminalLaunchAction } from "./TerminalLaunchAction";

const preflight = vi.mocked(trpc.tasks.terminal.preflight.query);
const open = vi.mocked(trpc.tasks.terminal.open.mutate);
const ACTION = { name: "Abrir no terminal" };
const SESSION = { sessionId: "00000000-0000-4000-8000-0000000000aa", unavailableIssueImages: 0 };

async function openDialog() {
  preflight.mockResolvedValue(preflightOf());
  const onOpened = vi.fn();
  render(<TerminalLaunchAction detail={approvedDetail()} onOpened={onOpened} />);
  await userEvent.click(screen.getByRole("button", ACTION));
  const dialog = await screen.findByRole("dialog");
  await within(dialog).findByLabelText("Prompt");
  return { dialog, onOpened, confirm: () => within(dialog).getByRole("button", ACTION) };
}

describe("TerminalLaunchDialog confirmation", () => {
  it("V-09j sends the edited prompt and closes the dialog, refreshing the screen", async () => {
    open.mockResolvedValue(SESSION);
    const { dialog, onOpened, confirm } = await openDialog();
    await userEvent.type(within(dialog).getByLabelText("Prompt"), " Use o componente Button existente.");
    await userEvent.click(confirm());
    await waitFor(() => expect(onOpened).toHaveBeenCalledOnce());
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ prompt: `${DEFAULT_PROMPT} Use o componente Button existente.`, attachmentIds: [], issueImageIds: [] }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("V-09j sends a single request on a double click", async () => {
    let finish: (value: typeof SESSION) => void = () => undefined;
    open.mockReturnValue(new Promise((resolve) => { finish = resolve; }) as never);
    const { confirm } = await openDialog();
    await userEvent.dblClick(confirm());
    expect(open).toHaveBeenCalledTimes(1);
    expect((screen.getByRole("button", { name: "Abrindo…" }) as HTMLButtonElement).disabled).toBe(true);
    finish(SESSION);
  });

  it("V-09j reuses the same request key when trying again after a network failure", async () => {
    open.mockRejectedValueOnce(new Error("Failed to fetch")).mockResolvedValueOnce(SESSION);
    const { confirm, dialog } = await openDialog();
    await userEvent.click(confirm());
    expect((await within(dialog).findByRole("alert")).textContent).toContain("Não foi possível abrir o terminal agora");
    await userEvent.click(confirm());
    await waitFor(() => expect(open).toHaveBeenCalledTimes(2));
    const keys = open.mock.calls.map(([input]) => input.requestKey);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it.each([
    ["checkout_invalid", "A pasta vinculada não é mais um clone válido de acme/shop. Atualize o vínculo nas Configurações."],
    ["claude_unavailable", "Claude Code não encontrado no PATH."],
    ["skill_missing", "Skill spec-conformance não encontrada no Flow Dev."],
    ["operator_required", "Somente a pessoa operadora desta Issue pode agir."],
    ["terminal_disabled", "A abertura no terminal está desligada. Defina FLOW_DEV_TERMINAL_ENABLED=true no .env.local e reinicie o Flow Dev."],
  ])("V-09k shows the server message for %s and keeps the dialog open", async (reason, message) => {
    open.mockRejectedValue(terminalRejection(reason, message));
    const { confirm, dialog, onOpened } = await openDialog();
    await userEvent.click(confirm());
    expect((await within(dialog).findByRole("alert")).textContent).toBe(message);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(onOpened).not.toHaveBeenCalled();
  });
});
