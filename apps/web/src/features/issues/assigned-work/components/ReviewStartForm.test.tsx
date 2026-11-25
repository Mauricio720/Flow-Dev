import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { reviewOf, SONNET_HIGH } from "@/test/review";
import { OPUS_MAX } from "@/test/terminal";
import { STOP_CONFIRM_LABEL, STOP_CONFIRM_MESSAGE } from "../reviewCopy";
import { ReviewConfirm } from "./ReviewConfirm";
import { ReviewStartForm } from "./ReviewStartForm";

const STARTED = { kind: "started" } as const;

function selectedChoice(groupName: string) {
  const group = screen.getByRole("group", { name: groupName });
  const text = (label: string) => (within(group).getByLabelText(label) as HTMLSelectElement).selectedOptions[0]!.text;
  return [text("Agente"), text("Modelo"), text("Esforço")];
}

describe("ReviewStartForm", () => {
  it("V-11h offers Review and Execution in Claude Code · Opus · Máximo with Iniciar revisão enabled", () => {
    render(<ReviewStartForm view={reviewOf(null)} onStart={vi.fn()} />);
    expect(selectedChoice("Revisão")).toEqual(["Claude Code", "Opus", "Máximo"]);
    expect(selectedChoice("Execução")).toEqual(["Claude Code", "Opus", "Máximo"]);
    expect((screen.getByRole("button", { name: "Iniciar revisão" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole("button", { name: "Revisar mesmo assim" })).toBeNull();
  });

  it("V-11h fills Review with the defaults of the last cycle", () => {
    const view = reviewOf(null, { defaults: { reviewer: SONNET_HIGH, executor: OPUS_MAX } });
    render(<ReviewStartForm view={view} onStart={vi.fn()} />);
    expect(selectedChoice("Revisão")).toEqual(["Claude Code", "Sonnet", "Alto"]);
    expect(selectedChoice("Execução")).toEqual(["Claude Code", "Opus", "Máximo"]);
  });

  it("V-11h disables the start with 5 of 7 tasks and offers Revisar mesmo assim", () => {
    render(<ReviewStartForm view={reviewOf(null, { tasks: { total: 7, completed: 5 } })} onStart={vi.fn()} />);
    expect(screen.getByText("Faltam 2 de 7 tarefas")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Iniciar revisão" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Revisar mesmo assim" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("V-11b confirms the partial review and starts with partial true", async () => {
    const onStart = vi.fn().mockResolvedValue(STARTED);
    render(<ReviewStartForm view={reviewOf(null, { tasks: { total: 7, completed: 5 } })} onStart={onStart} />);
    await userEvent.click(screen.getByRole("button", { name: "Revisar mesmo assim" }));
    const dialog = screen.getByRole("dialog", { name: "Faltam 2 de 7 tarefas. A revisão sai marcada como parcial e vale só para o que já foi feito. Revisar mesmo assim?" });
    expect(onStart).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Revisar mesmo assim" }));
    expect(onStart).toHaveBeenCalledWith({ reviewer: OPUS_MAX, executor: OPUS_MAX, partial: true, allowOpenSessions: false });
  });

  it("V-11b asks again about open sessions and resends with allowOpenSessions true", async () => {
    const onStart = vi.fn().mockResolvedValueOnce({ kind: "sessions_open", count: 2 }).mockResolvedValueOnce(STARTED);
    render(<ReviewStartForm view={reviewOf(null)} onStart={onStart} />);
    await userEvent.click(screen.getByRole("button", { name: "Iniciar revisão" }));
    const dialog = await screen.findByRole("dialog", { name: "Há 2 sessões abertas neste trabalho. A revisão pode ver mudanças que elas ainda estão fazendo. Iniciar mesmo assim?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Iniciar mesmo assim" }));
    expect(onStart).toHaveBeenNthCalledWith(1, { reviewer: OPUS_MAX, executor: OPUS_MAX, partial: false, allowOpenSessions: false });
    expect(onStart).toHaveBeenNthCalledWith(2, { reviewer: OPUS_MAX, executor: OPUS_MAX, partial: false, allowOpenSessions: true });
  });

  it("shows the refusal message when the start fails", async () => {
    const onStart = vi.fn().mockResolvedValue({ kind: "failed", message: "Já existe uma revisão em andamento neste trabalho." });
    render(<ReviewStartForm view={reviewOf(null)} onStart={onStart} />);
    await userEvent.click(screen.getByRole("button", { name: "Iniciar revisão" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Já existe uma revisão em andamento neste trabalho.");
  });
});

describe("ReviewConfirm", () => {
  it("V-11b puts the focus on the main button and cancels with Escape", async () => {
    const onCancel = vi.fn();
    render(<ReviewConfirm message={STOP_CONFIRM_MESSAGE} confirmLabel={STOP_CONFIRM_LABEL} destructive onConfirm={vi.fn()} onCancel={onCancel} />);
    expect(screen.getByRole("dialog", { name: "As duas sessões do ciclo serão encerradas. O que elas já mudaram no checkout continua lá. Parar a revisão?" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: STOP_CONFIRM_LABEL }));
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("V-11b confirms with the keyboard", async () => {
    const onConfirm = vi.fn();
    render(<ReviewConfirm message={STOP_CONFIRM_MESSAGE} confirmLabel={STOP_CONFIRM_LABEL} onConfirm={onConfirm} onCancel={vi.fn()} />);
    await userEvent.keyboard("{Enter}");
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
