import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TerminalSessionStatus } from "../executionContract";
import { SessionControls } from "./SessionControls";

const CONFIRM_TEXT = "Encerrar a sessão? O Claude para, e a conversa fica só para leitura.";

function show(status: TerminalSessionStatus = "running") {
  const onInterrupt = vi.fn().mockResolvedValue(null);
  const onEnd = vi.fn().mockResolvedValue(null);
  render(<SessionControls status={status} busy={false} onInterrupt={onInterrupt} onEnd={onEnd} />);
  return { onInterrupt, onEnd };
}

describe("SessionControls", () => {
  it("V-28f interrupts a running session", async () => {
    const { onInterrupt } = show("running");
    await userEvent.click(screen.getByRole("button", { name: "Interromper" }));
    expect(onInterrupt).toHaveBeenCalledOnce();
  });

  it("V-28f offers Interromper while the session needs the person and not while it waits, is interrupted or is opening", () => {
    show("asking");
    expect(screen.getByRole("button", { name: "Interromper" })).toBeTruthy();
  });

  it.each(["waiting", "interrupted", "opening", "unconfirmed"] as const)("V-28f has no Interromper in %s, only Encerrar", (status) => {
    show(status);
    expect(screen.queryByRole("button", { name: "Interromper" })).toBeNull();
    expect(screen.getByRole("button", { name: "Encerrar" })).toBeTruthy();
  });

  it("V-28f asks for confirmation with the exact text and ends only after the person confirms", async () => {
    const { onEnd } = show("waiting");
    await userEvent.click(screen.getByRole("button", { name: "Encerrar" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(CONFIRM_TEXT)).toBeTruthy();
    expect(onEnd).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Encerrar sessão" }));
    expect(onEnd).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("V-28f closes the confirmation with Esc without ending and gives the focus back", async () => {
    const { onEnd } = show("waiting");
    const trigger = screen.getByRole("button", { name: "Encerrar" });
    await userEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeTruthy();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onEnd).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("closes the confirmation with Cancelar without ending", async () => {
    const { onEnd } = show("waiting");
    await userEvent.click(screen.getByRole("button", { name: "Encerrar" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("shows the refusal when the interrupt or the end fails", async () => {
    const onInterrupt = vi.fn().mockResolvedValue("Esta sessão não está mais ativa.");
    render(<SessionControls status="running" busy={false} onInterrupt={onInterrupt} onEnd={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Interromper" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Esta sessão não está mais ativa.");
  });
});
