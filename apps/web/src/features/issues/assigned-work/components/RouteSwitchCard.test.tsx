import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { routeSwitchOf } from "@/test/session";
import type { RouteSwitchView } from "../sessionContract";
import { RouteSwitchCard } from "./RouteSwitchCard";

const CONFIRM = { name: "Trocar para execução direta" };
const DECLINE = { name: "Continuar com a spec" };

function show(patch: Partial<RouteSwitchView> = {}, options: { canDecide?: boolean; pending?: boolean } = {}) {
  const onDecide = vi.fn();
  render(<RouteSwitchCard proposal={routeSwitchOf(patch).proposal} canDecide={options.canDecide ?? true} pending={options.pending ?? false} error={null} onDecide={onDecide} />);
  return onDecide;
}

describe("RouteSwitchCard", () => {
  it("V-08a shows the summary, the two reasons and both decisions to the session owner", async () => {
    const onDecide = show();
    const card = screen.getByRole("region", { name: "Proposta de troca de rota" });
    expect(within(card).getByText("Mudança de texto em uma tela, sem regra nova")).toBeTruthy();
    const reasons = within(card).getByRole("list", { name: "Motivos da troca" });
    expect(within(reasons).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["As respostas fixaram o texto e a tela.", "Segue o padrão de planningCopy.ts."]);
    await userEvent.click(screen.getByRole("button", CONFIRM));
    await userEvent.click(screen.getByRole("button", DECLINE));
    expect(onDecide.mock.calls).toEqual([["confirm"], ["decline"]]);
  });

  it("V-08b shows a pending proposal to a reader without buttons and with the waiting note", () => {
    show({}, { canDecide: false });
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Aguardando a pessoa operadora decidir a troca de rota")).toBeTruthy();
  });

  it("V-08c shows a confirmed proposal with who confirmed and no buttons", () => {
    show({ state: "confirmed", decidedBy: "Ana", decidedAt: "2026-11-25T13:06:00.000Z" });
    expect(screen.getByText("Troca confirmada por Ana")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("V-08d shows a declined proposal with who declined and no buttons", () => {
    show({ state: "declined", decidedBy: "Ana", decidedAt: "2026-11-25T13:06:00.000Z" });
    expect(screen.getByText("Troca recusada por Ana")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("V-08e shows an expired proposal with the expiry note and no buttons", () => {
    show({ state: "expired" });
    expect(screen.getByText("Proposta expirada: a sessão terminou antes da decisão")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("V-08f disables both buttons and marks them busy while the decision is being sent", () => {
    show({}, { pending: true });
    for (const name of [CONFIRM, DECLINE]) {
      const button = screen.getByRole("button", name) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.getAttribute("aria-busy")).toBe("true");
    }
  });

  it("shows the summary and the reasons as plain text, never as HTML", () => {
    show({ summary: "<script>alert(1)</script>", reasons: ["<b>negrito</b>"] });
    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector("b")).toBeNull();
    expect(screen.getByText("<script>alert(1)</script>")).toBeTruthy();
    expect(screen.getByText("<b>negrito</b>")).toBeTruthy();
  });

  it("shows the decision error as an alert", () => {
    render(<RouteSwitchCard proposal={routeSwitchOf().proposal} canDecide pending={false} error="Essa proposta já foi decidida." onDecide={vi.fn()} />);
    expect(screen.getByRole("alert").textContent).toBe("Essa proposta já foi decidida.");
  });
});
