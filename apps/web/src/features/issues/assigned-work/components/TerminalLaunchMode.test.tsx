import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { approvedDetail } from "@/test/tasks";
import { preflightOf } from "@/test/terminal";
import { TerminalLaunchAction } from "./TerminalLaunchAction";

const preflight = vi.mocked(trpc.tasks.terminal.preflight.query);
const open = vi.mocked(trpc.tasks.terminal.open.mutate);
const START = { name: "Iniciar sessão" };
const SESSION = { sessionId: "00000000-0000-4000-8000-0000000000aa", unavailableIssueImages: 0 };
const OFFLINE = "O serviço de sessões do Flow Dev não está rodando. Inicie o Flow Dev com pnpm dev e tente de novo.";

async function openDialog(result = preflightOf()) {
  preflight.mockResolvedValue(result);
  render(<TerminalLaunchAction detail={approvedDetail()} onOpened={vi.fn()} />);
  await userEvent.click(screen.getByRole("button", START));
  const dialog = await screen.findByRole("dialog", { name: "Iniciar a sessão do Claude" });
  await waitFor(() => expect(within(dialog).queryByText("Preparando a abertura…")).toBeNull());
  return dialog;
}

describe("TerminalLaunchDialog permission mode", () => {
  it("V-29a offers the three modes with Tudo liberado selected and confirms with bypass by default", async () => {
    open.mockResolvedValue(SESSION);
    const dialog = await openDialog();
    const group = within(dialog).getByRole("group", { name: "Modo de permissões" });
    const radios = within(group).getAllByRole("radio") as HTMLInputElement[];
    expect(radios.map((radio) => [radio.value, radio.checked])).toEqual([["bypass", true], ["accept_edits", false], ["ask_all", false]]);
    expect(within(group).getByRole("radio", { name: /Tudo liberado/ })).toBeTruthy();
    expect(within(group).getByRole("radio", { name: /Aceitar edições, perguntar comandos/ })).toBeTruthy();
    expect(within(group).getByRole("radio", { name: /Perguntar tudo/ })).toBeTruthy();
    await userEvent.click(within(dialog).getByRole("button", START));
    await waitFor(() => expect(open).toHaveBeenCalledOnce());
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ permissionMode: "bypass" }));
  });

  it("V-29a sends the mode the person chose", async () => {
    open.mockResolvedValue(SESSION);
    const dialog = await openDialog();
    await userEvent.click(within(dialog).getByRole("radio", { name: /Perguntar tudo/ }));
    await userEvent.click(within(dialog).getByRole("button", START));
    await waitFor(() => expect(open).toHaveBeenCalledOnce());
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ permissionMode: "ask_all" }));
  });

  it("V-29a describes what each mode does", async () => {
    const dialog = await openDialog();
    expect(within(dialog).getByText("Edições de arquivo no clone seguem sozinhas; comandos e as demais ferramentas pedem a sua aprovação.")).toBeTruthy();
  });

  it("V-29d shows the exact stopped-service message and offers no confirmation or mode choice", async () => {
    const dialog = await openDialog(preflightOf({ sessionService: { running: false } }));
    expect(within(dialog).getByRole("alert").textContent).toBe(OFFLINE);
    expect(within(dialog).queryByRole("button", START)).toBeNull();
    expect(within(dialog).queryByRole("group", { name: "Modo de permissões" })).toBeNull();
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toBeTruthy();
  });
});
