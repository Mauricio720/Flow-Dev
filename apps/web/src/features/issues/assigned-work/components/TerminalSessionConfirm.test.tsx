import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { approvedDetail } from "@/test/tasks";
import { preflightOf, terminalRejection } from "@/test/terminal";
import { TerminalLaunchAction } from "./TerminalLaunchAction";

const preflight = vi.mocked(trpc.tasks.terminal.preflight.query);
const open = vi.mocked(trpc.tasks.terminal.open.mutate);
const ACTION = { name: "Abrir no terminal" };
const QUESTION = "Já existe uma sessão aberta para esta tarefa. Abrir outra?";
const SESSION = { sessionId: "00000000-0000-4000-8000-0000000000aa", unavailableIssueImages: 0 };

async function refusedDialog() {
  preflight.mockResolvedValue(preflightOf());
  open.mockRejectedValueOnce(terminalRejection("session_already_active", QUESTION, "CONFLICT"));
  const onOpened = vi.fn();
  render(<TerminalLaunchAction detail={approvedDetail()} onOpened={onOpened} />);
  await userEvent.click(screen.getByRole("button", ACTION));
  const dialog = await screen.findByRole("dialog");
  await within(dialog).findByLabelText("Prompt");
  await userEvent.click(within(dialog).getByRole("button", ACTION));
  await within(dialog).findByText(QUESTION);
  return { dialog, onOpened };
}

describe("TerminalLaunchDialog second session", () => {
  it("V-08s asks before opening another session and resends with the same key and allowAdditional", async () => {
    open.mockClear();
    const { dialog, onOpened } = await refusedDialog();
    open.mockResolvedValueOnce(SESSION);
    await userEvent.click(within(dialog).getByRole("button", { name: "Abrir outra" }));
    await waitFor(() => expect(onOpened).toHaveBeenCalledOnce());
    const [first, second] = open.mock.calls.map(([input]) => input);
    expect(first).toMatchObject({ allowAdditional: false });
    expect(second).toMatchObject({ allowAdditional: true, requestKey: first!.requestKey });
  });

  it("V-08s keeps the dialog and calls nothing when the person cancels", async () => {
    open.mockClear();
    const { dialog, onOpened } = await refusedDialog();
    const callsBefore = open.mock.calls.length;
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(open.mock.calls.length).toBe(callsBefore);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.queryByText(QUESTION)).toBeNull();
    expect(onOpened).not.toHaveBeenCalled();
  });
});
