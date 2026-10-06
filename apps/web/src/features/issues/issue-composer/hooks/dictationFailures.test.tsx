import { act, fireEvent, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NEW_INTENT_SCOPE, messageBox, renderDictation, sendButton, startListening } from "@/test/dictationHarness";
import { installDictation } from "@/test/media";
import { deferred } from "@/test/projects";
import { useDictation } from "./useDictation";

const TYPED = "Corrigir checkout";
const LIMIT_MS = 180_000;
const FINAL_SECOND_MS = 1_000;

function refuse(name: string) {
  return () => Promise.reject(new DOMException("recusado", name));
}

async function startRefused(name: string) {
  const media = installDictation({ getUserMedia: refuse(name) });
  const view = renderDictation();
  await userEvent.type(messageBox(), TYPED);
  await userEvent.click(screen.getByRole("button", { name: "Iniciar ditado" }));
  return { media, view, alert: await screen.findByRole("alert") };
}

describe("dictation failures", () => {
  it("UT-058 returns permission_denied and leaves the input unchanged", async () => {
    installDictation({ getUserMedia: refuse("NotAllowedError") });
    const { result } = renderHook(() => useDictation(NEW_INTENT_SCOPE, true));
    act(() => result.current.setText(TYPED));
    act(() => result.current.start());
    await waitFor(() => expect(result.current.reason).toBe("permission_denied"));
    expect(result.current).toMatchObject({ text: TYPED, phase: "failed", capturing: false });
  });

  it("UT-114 explains a denied permission and keeps the existing typing", async () => {
    const { alert } = await startRefused("NotAllowedError");
    expect(alert.textContent).toContain("negou o uso do microfone");
    expect(messageBox().value).toBe(TYPED);
  });

  it("UT-111 stops with device_error, releases the capture and keeps typing available", async () => {
    const { media, alert } = await startRefused("NotReadableError");
    expect(alert.textContent).toContain("O microfone não pôde ser usado");
    expect(messageBox().value).toBe(TYPED);
    expect(media.preflight).toHaveBeenLastCalledWith(expect.objectContaining({ action: "cancel" }));
  });

  it("UT-112 shows no_microphone and adds no message", async () => {
    const { view, alert } = await startRefused("NotFoundError");
    expect(alert.textContent).toContain("Nenhum microfone foi encontrado");
    expect(view.onSend).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Iniciar ditado" })).toBeTruthy();
  });

  it("UT-113 stops at exactly 180 seconds with a visible limit reason and no Send", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const media = installDictation();
    const { onSend } = renderDictation();
    fireEvent.change(messageBox(), { target: { value: TYPED } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar ditado" }));
    await screen.findByRole("button", { name: "Parar ditado" });
    await act(async () => vi.advanceTimersByTimeAsync(LIMIT_MS - FINAL_SECOND_MS));
    expect(media.upload).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(FINAL_SECOND_MS));
    expect((await screen.findByText(/limite de tempo/)).textContent).toContain("nada foi enviado");
    expect(messageBox().value).toBe("Corrigir checkout ao remover item");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("UT-115 starts one capture session when Start is selected twice", async () => {
    const permission = deferred<unknown>();
    const media = installDictation({ getUserMedia: () => permission.promise });
    renderDictation();
    const start = screen.getByRole("button", { name: "Iniciar ditado" });
    act(() => {
      fireEvent.click(start);
      fireEvent.click(start);
    });
    await waitFor(() => expect(media.getUserMedia).toHaveBeenCalledTimes(1));
    expect(media.preflight.mock.calls.filter(([body]) => body.action === "start")).toHaveLength(1);
    expect(screen.getByRole("status").textContent).toContain("Aguardando a permissão do microfone");
  });

  it("UT-124 keeps typing and holds Send until the interrupted capture is cleaned up", async () => {
    const released = deferred<Response>();
    const media = installDictation({ release: () => released.promise });
    renderDictation();
    await startListening();
    act(() => media.tracks[0].end());
    expect(sendButton().disabled).toBe(true);
    await act(async () => released.resolve(Response.json({ released: true })));
    expect((await screen.findByRole("alert")).textContent).toContain("interrompida antes de terminar");
    expect(messageBox().value).toBe(TYPED);
    expect(sendButton().disabled).toBe(false);
  });
});
