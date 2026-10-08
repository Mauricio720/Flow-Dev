import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Q1, R1 } from "@/test/spec";
import { SpecInteraction } from "./SpecInteraction";

const question = { id: Q1, attemptId: R1, kind: "question", description: "Qual prazo?", choices: ["Thirty days", "Ninety days"], targetDigest: null, delivery: "pending" };
const permission = (patch = {}) => ({ id: "p1", attemptId: R1, kind: "permission", description: "Escrever _prd.md", choices: null, targetDigest: "c".repeat(64), delivery: "pending", ...patch });
const view = (interaction: unknown, onSubmit = vi.fn(), canAct = true) => render(<SpecInteraction interaction={interaction as never} canAct={canAct} busy={false} onSubmit={onSubmit} />);

describe("SpecInteraction", () => {
  it("UT-045 submits nothing until Enviar is activated after choosing an option", () => {
    const onSubmit = vi.fn();
    view(question, onSubmit);
    fireEvent.click(screen.getByLabelText("Thirty days"));
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onSubmit).toHaveBeenCalledWith({ action: "spec.answer", attemptId: R1, interactionId: Q1, response: { choiceIndex: 0 } });
  });

  it("keeps Enviar disabled without an explicit choice or text and never preselects an option", () => {
    view(question);
    expect((screen.getByRole("button", { name: "Enviar" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("Thirty days") as HTMLInputElement).checked).toBe(false);
  });

  it("UT-046 removes the allow action and shows an integration error when the target is missing", () => {
    view(permission({ targetDigest: null }));
    expect(screen.queryByRole("button", { name: "Permitir uma vez" })).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("Erro de integração");
  });

  it("offers only one-time decisions and sends the recorded action digest", () => {
    const onSubmit = vi.fn();
    view(permission(), onSubmit);
    expect(screen.queryByRole("button", { name: /sempre/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Negar uma vez" }));
    expect(onSubmit).toHaveBeenCalledWith({ action: "spec.permission", attemptId: R1, interactionId: "p1", actionDigest: "c".repeat(64), decision: "deny_once" });
  });

  it("IT-050 keeps two pending permissions individually actionable without a blanket grant", () => {
    const onSubmit = vi.fn();
    render(<><SpecInteraction interaction={permission({ id: "p1" }) as never} canAct busy={false} onSubmit={onSubmit} /><SpecInteraction interaction={permission({ id: "p2", description: "Escrever _tests.md" }) as never} canAct busy={false} onSubmit={onSubmit} /></>);
    const allow = screen.getAllByRole("button", { name: "Permitir uma vez" });
    expect(allow).toHaveLength(2);
    fireEvent.click(allow[1]!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ interactionId: "p2", decision: "allow_once" });
  });

  it("shows readers the pending request without controls", () => {
    view(permission(), vi.fn(), false);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Escrever _prd.md")).toBeTruthy();
  });
});
