import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { permissionOf } from "@/test/session";
import { PermissionRequestCard } from "./PermissionRequestCard";

function show(entry = permissionOf(), onDecide = vi.fn().mockResolvedValue(null), canAnswer = true) {
  render(<PermissionRequestCard entry={entry} canAnswer={canAnswer} busy={false} onDecide={onDecide} />);
  return onDecide;
}

describe("PermissionRequestCard", () => {
  it("V-28d shows the tool action and offers Permitir, Permitir sempre with the rule, and Recusar, each sending its decision", async () => {
    const onDecide = show();
    expect(screen.getByText("Rodar comando:")).toBeTruthy();
    expect(screen.getByText("pnpm test")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Permitir" }));
    await userEvent.click(screen.getByRole("button", { name: "Permitir sempre (Bash(pnpm test:*))" }));
    expect(onDecide.mock.calls).toEqual([["p1", "allow", undefined], ["p1", "allow_always", undefined]]);
    expect(screen.getByRole("button", { name: "Recusar" })).toBeTruthy();
  });

  it("V-28d offers only Permitir and Recusar when Claude Code suggested no rule", () => {
    show(permissionOf({ suggestedRule: null }));
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Permitir", "Recusar"]);
  });

  it("V-28d sends Recusar with the reason the person wrote", async () => {
    const onDecide = show();
    await userEvent.click(screen.getByRole("button", { name: "Recusar" }));
    await userEvent.type(screen.getByLabelText("Motivo da recusa (opcional)"), "Não apague o build, só rode o lint");
    await userEvent.click(screen.getByRole("button", { name: "Enviar recusa" }));
    expect(onDecide).toHaveBeenCalledWith("p1", "deny", "Não apague o build, só rode o lint");
  });

  it("V-28d denies without a reason when none is written", async () => {
    const onDecide = show();
    await userEvent.click(screen.getByRole("button", { name: "Recusar" }));
    await userEvent.click(screen.getByRole("button", { name: "Enviar recusa" }));
    expect(onDecide).toHaveBeenCalledWith("p1", "deny", undefined);
  });

  it("V-28d blocks a reason of 2001 characters with the limit message and accepts 2000", async () => {
    const onDecide = show();
    await userEvent.click(screen.getByRole("button", { name: "Recusar" }));
    const field = screen.getByLabelText("Motivo da recusa (opcional)");
    await userEvent.click(field);
    await userEvent.paste("r".repeat(2_001));
    expect((screen.getByRole("button", { name: "Enviar recusa" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("O motivo pode ter até 2.000 caracteres.")).toBeTruthy();
    await userEvent.clear(field);
    await userEvent.paste("r".repeat(2_000));
    expect((screen.getByRole("button", { name: "Enviar recusa" }) as HTMLButtonElement).disabled).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Enviar recusa" }));
    expect(onDecide).toHaveBeenCalledWith("p1", "deny", "r".repeat(2_000));
  });

  it("shows the server refusal on the card", async () => {
    show(permissionOf(), vi.fn().mockResolvedValue("Este pedido não está mais aberto."));
    await userEvent.click(screen.getByRole("button", { name: "Permitir" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Este pedido não está mais aberto.");
  });

  it("shows a decided request with its outcome and the reason, a cancelled one as Cancelada, and no buttons", () => {
    const { unmount } = render(<PermissionRequestCard entry={permissionOf({ status: "answered", decision: "deny", reason: "Só rode o lint" })} canAnswer busy={false} onDecide={vi.fn()} />);
    expect(screen.getByText("Recusado: Só rode o lint")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    unmount();
    render(<PermissionRequestCard entry={permissionOf({ status: "cancelled" })} canAnswer busy={false} onDecide={vi.fn()} />);
    expect(screen.getByText("Cancelada")).toBeTruthy();
  });
});
