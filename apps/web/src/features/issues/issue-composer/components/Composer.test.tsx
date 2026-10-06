import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { messageBox, renderDictation, sendButton, startListening, stopListening } from "@/test/dictationHarness";
import { installDictation, transcript } from "@/test/media";
import { deferred } from "@/test/projects";

const OVER_LIMIT = 10_001;
const LONG_TRANSCRIPT = `${"ajustar o cálculo do carrinho ".repeat(40)}usando cartTotal e Drizzle`;

function pressEnter() {
  fireEvent.keyDown(messageBox(), { key: "Enter" });
}

describe("composer with dictated text", () => {
  it("UT-121 lets the author correct a misspelled transcript before Send", async () => {
    installDictation({ upload: transcript("usar drizel no carrinho") });
    const { onSend } = renderDictation();
    await startListening("");
    await stopListening();
    await waitFor(() => expect(messageBox().value).toBe("usar drizel no carrinho"));
    await userEvent.clear(messageBox());
    await userEvent.type(messageBox(), "usar Drizzle no carrinho");
    await userEvent.click(sendButton());
    expect(onSend).toHaveBeenCalledExactlyOnceWith("usar Drizzle no carrinho");
  });

  it("IT-126 (UT-123) keeps the full provider transcript editable and blocks Send with the limit", async () => {
    installDictation({ upload: transcript("a".repeat(OVER_LIMIT)) });
    const { onSend } = renderDictation();
    await startListening("");
    await stopListening();
    await waitFor(() => expect(messageBox().value).toHaveLength(OVER_LIMIT));
    expect(screen.getByRole("alert").textContent).toContain("10.001 caracteres e o limite é 10.000");
    expect(sendButton().disabled).toBe(true);
    pressEnter();
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.change(messageBox(), { target: { value: "a".repeat(OVER_LIMIT - 1) } });
    expect(sendButton().disabled).toBe(false);
  });

  it("UT-128 submits nothing while listening or processing", async () => {
    const pending = deferred<Response>();
    installDictation({ upload: () => pending.promise });
    const { onSend } = renderDictation();
    await startListening();
    expect(sendButton().disabled).toBe(true);
    pressEnter();
    await stopListening();
    expect(screen.getByRole("status").textContent).toContain("Transcrevendo o áudio");
    expect(sendButton().disabled).toBe(true);
    pressEnter();
    expect(onSend).not.toHaveBeenCalled();
    await act(async () => pending.resolve(Response.json({ text: "ao remover item" })));
    await waitFor(() => expect(sendButton().disabled).toBe(false));
  });

  it("UT-130 keeps a long transcript with technical identifiers reachable before manual Send", async () => {
    installDictation({ upload: transcript(LONG_TRANSCRIPT) });
    const { onSend } = renderDictation();
    await startListening("");
    await stopListening();
    await waitFor(() => expect(messageBox().value).toBe(LONG_TRANSCRIPT));
    await userEvent.type(messageBox(), " no checkout");
    expect(messageBox().value).toContain("cartTotal e Drizzle no checkout");
    expect(onSend).not.toHaveBeenCalled();
    await userEvent.click(sendButton());
    expect(onSend).toHaveBeenCalledExactlyOnceWith(`${LONG_TRANSCRIPT} no checkout`);
  });

  it("explains remote processing before the first capture and starts only after consent", async () => {
    const media = installDictation();
    window.localStorage.clear();
    renderDictation();
    await userEvent.click(screen.getByRole("button", { name: "Iniciar ditado" }));
    expect(screen.getByRole("group", { name: "Aviso sobre o ditado" }).textContent).toContain("enviado à Groq");
    expect(media.getUserMedia).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Entendi, iniciar ditado" }));
    expect(await screen.findByRole("button", { name: "Parar ditado" })).toBeTruthy();
    expect(media.getUserMedia).toHaveBeenCalledExactlyOnceWith({ audio: true });
  });
});
