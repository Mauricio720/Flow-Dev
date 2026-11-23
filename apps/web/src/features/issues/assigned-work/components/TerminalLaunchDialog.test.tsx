import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { approvedDetail } from "@/test/tasks";
import { CHECKOUT_PATH, DEFAULT_PROMPT, preflightOf } from "@/test/terminal";
import { TerminalLaunchAction } from "./TerminalLaunchAction";

const preflight = vi.mocked(trpc.tasks.terminal.preflight.query);
const ACTION = { name: "Iniciar sessão" };

async function openDialog(result = preflightOf()) {
  preflight.mockResolvedValue(result);
  const onOpened = vi.fn();
  render(<TerminalLaunchAction detail={approvedDetail()} onOpened={onOpened} />);
  const trigger = screen.getByRole("button", ACTION);
  await userEvent.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: "Iniciar a sessão do Claude" });
  await within(dialog).findByLabelText("Prompt");
  return { dialog, trigger, onOpened };
}

describe("TerminalLaunchDialog", () => {
  it("V-09b shows the folder, the branch and the default prompt in a labelled editable field", async () => {
    const { dialog } = await openDialog();
    expect(within(dialog).getByText(CHECKOUT_PATH)).toBeTruthy();
    expect(within(dialog).getByText("Branch: main")).toBeTruthy();
    const field = within(dialog).getByLabelText("Prompt") as HTMLTextAreaElement;
    expect(field.value).toBe(DEFAULT_PROMPT);
    expect(field.value.startsWith("/flow-dev:direct-executor")).toBe(true);
    expect(field.disabled).toBe(false);
  });

  it("V-09c names a detached HEAD", async () => {
    const { dialog } = await openDialog(preflightOf({ checkout: { path: CHECKOUT_PATH, branch: null, detachedSha: "a1b2c3d", dirty: false } }));
    expect(within(dialog).getByText("HEAD destacado (a1b2c3d)")).toBeTruthy();
  });

  it("V-09d warns about uncommitted changes without blocking the confirmation", async () => {
    const { dialog } = await openDialog(preflightOf({ checkout: { path: CHECKOUT_PATH, branch: "main", detachedSha: null, dirty: true } }));
    expect(within(dialog).getByText("Há mudanças não commitadas nesta pasta. O Claude vai trabalhar sobre elas.")).toBeTruthy();
    expect((within(dialog).getByRole("button", ACTION) as HTMLButtonElement).disabled).toBe(false);
  });

  it("V-09e explains the missing link, points to the settings and offers no confirmation", async () => {
    preflight.mockResolvedValue(preflightOf({ checkout: null }));
    render(<TerminalLaunchAction detail={approvedDetail()} onOpened={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", ACTION));
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText(/Você ainda não vinculou o clone local deste projeto/)).toBeTruthy();
    const link = within(dialog).getByRole("link", { name: "Abrir Configurações do projeto" });
    expect(link.getAttribute("href")).toMatch(/^\/projects\/.+\/settings$/);
    expect(within(dialog).queryByRole("button", ACTION)).toBeNull();
    expect(within(dialog).queryByLabelText("Prompt")).toBeNull();
  });

  it("V-09f blocks an empty prompt and one over 20.000 characters and follows the counter while typing", async () => {
    const { dialog } = await openDialog();
    const field = within(dialog).getByLabelText("Prompt");
    const confirm = () => within(dialog).getByRole("button", ACTION) as HTMLButtonElement;
    fireEvent.change(field, { target: { value: "" } });
    expect(confirm().disabled).toBe(true);
    expect(within(dialog).getByText("O prompt precisa ter entre 1 e 20.000 caracteres.")).toBeTruthy();
    fireEvent.change(field, { target: { value: "a".repeat(20_001) } });
    expect(confirm().disabled).toBe(true);
    expect(within(dialog).getByText("20.001 / 20.000")).toBeTruthy();
    fireEvent.change(field, { target: { value: "abc" } });
    expect(confirm().disabled).toBe(false);
    expect(within(dialog).getByText("3 / 20.000")).toBeTruthy();
  });

  it("V-09g moves focus into the dialog, keeps Tab inside, announces the counter and returns focus on Esc", async () => {
    const { dialog, trigger } = await openDialog();
    expect(dialog.contains(document.activeElement)).toBe(true);
    for (let press = 0; press < 8; press += 1) {
      await userEvent.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    expect(within(dialog).getByText(/\/ 20\.000/).closest("[aria-live]")?.getAttribute("aria-live")).toBe("polite");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("tells the person when the preparation fails and keeps the dialog closable", async () => {
    preflight.mockRejectedValue(new Error("Failed to fetch"));
    render(<TerminalLaunchAction detail={approvedDetail()} onOpened={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", ACTION));
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível preparar a abertura");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
