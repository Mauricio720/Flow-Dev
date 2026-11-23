import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SessionComposer } from "./SessionComposer";

const field = () => screen.getByRole("textbox", { name: "Mensagem para o Claude" }) as HTMLTextAreaElement;
const send = () => screen.getByRole("button", { name: "Enviar" }) as HTMLButtonElement;

function show(onSend = vi.fn().mockResolvedValue(null), busy = false) {
  render(<SessionComposer busy={busy} onSend={onSend} />);
  return onSend;
}

describe("SessionComposer", () => {
  it("V-28e sends the typed text with Ctrl+Enter and a request key, and clears the field", async () => {
    const onSend = show();
    await userEvent.type(field(), "Rode também o lint");
    await userEvent.keyboard("{Control>}{Enter}{/Control}");
    expect(onSend).toHaveBeenCalledOnce();
    expect(onSend.mock.calls[0]![0]).toBe("Rode também o lint");
    expect(onSend.mock.calls[0]![1]).toMatch(/^[0-9a-f-]{36}$/);
    expect(await screen.findByDisplayValue("")).toBeTruthy();
  });

  it("V-28e breaks the line on Enter without sending", async () => {
    const onSend = show();
    await userEvent.type(field(), "linha 1{Enter}linha 2");
    expect(field().value).toBe("linha 1\nlinha 2");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("V-28e keeps the send disabled for an empty message and for one of 20001 characters, naming the limit", async () => {
    show();
    expect(send().disabled).toBe(true);
    await userEvent.click(field());
    await userEvent.paste("x".repeat(20_001));
    expect(send().disabled).toBe(true);
    expect(screen.getByText("A mensagem precisa ter entre 1 e 20.000 caracteres.")).toBeTruthy();
    fireEvent.change(field(), { target: { value: "x".repeat(20_000) } });
    expect(send().disabled).toBe(false);
  });

  it("sends a skill command exactly as typed", async () => {
    const onSend = show();
    fireEvent.change(field(), { target: { value: "/flow-dev:spec-to-tasks  docs/specs/x" } });
    await userEvent.click(send());
    expect(onSend.mock.calls[0]![0]).toBe("/flow-dev:spec-to-tasks  docs/specs/x");
  });

  it("keeps the text and reuses the same request key when the send fails, so a resend is one message", async () => {
    const onSend = vi.fn().mockResolvedValueOnce("Não foi possível concluir agora. Tente de novo.").mockResolvedValueOnce(null);
    show(onSend);
    fireEvent.change(field(), { target: { value: "oi" } });
    await userEvent.click(send());
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível concluir agora. Tente de novo.");
    expect(field().value).toBe("oi");
    await userEvent.click(send());
    expect(onSend.mock.calls[0]![1]).toBe(onSend.mock.calls[1]![1]);
  });

  it("uses a new request key for the next message after a successful send", async () => {
    const onSend = show();
    fireEvent.change(field(), { target: { value: "um" } });
    await userEvent.click(send());
    fireEvent.change(field(), { target: { value: "dois" } });
    await userEvent.click(send());
    expect(onSend.mock.calls[0]![1]).not.toBe(onSend.mock.calls[1]![1]);
  });
});
