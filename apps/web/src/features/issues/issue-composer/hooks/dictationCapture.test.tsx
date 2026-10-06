import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DictationHarness, messageBox, renderDictation, startListening, stopListening } from "@/test/dictationHarness";
import { installDictation, setVisibility, transcript } from "@/test/media";
import { deferred } from "@/test/projects";
import { P, T, U } from "@/test/tasks";

const CANCEL = "Cancelar ditado e restaurar o texto anterior";

describe("dictation capture through the composer", () => {
  it("UT-057 appends the transcript once after Stop without sending", async () => {
    const media = installDictation();
    const { onSend } = renderDictation();
    await startListening();
    await stopListening();
    await waitFor(() => expect(messageBox().value).toBe("Corrigir checkout ao remover item"));
    expect([media.upload.mock.calls.length, media.tracks[0].stop.mock.calls.length > 0]).toEqual([1, true]);
    expect(onSend).not.toHaveBeenCalled();
  });

  it("UT-117 appends once when Stop is repeated", async () => {
    const media = installDictation();
    renderDictation();
    const stop = await startListening();
    act(() => [stop, stop].forEach((button) => fireEvent.click(button)));
    await waitFor(() => expect(messageBox().value).toBe("Corrigir checkout ao remover item"));
    expect(media.upload).toHaveBeenCalledTimes(1);
  });

  it("UT-118 restores the original input on Cancel and ignores the late transcript", async () => {
    const pending = deferred<Response>();
    installDictation({ upload: () => pending.promise });
    renderDictation();
    await startListening();
    await stopListening();
    await userEvent.click(await screen.findByRole("button", { name: CANCEL }));
    await act(async () => pending.resolve(Response.json({ text: "ao remover item" })));
    expect(messageBox().value).toBe("Corrigir checkout");
    expect(screen.getByRole("status").textContent).toContain("O texto de antes da captura foi restaurado");
  });

  it("UT-122 keeps the input and explains that no speech was recognized", async () => {
    installDictation({ upload: transcript("") });
    renderDictation();
    await startListening();
    await stopListening();
    expect((await screen.findByText(/Nenhuma fala foi reconhecida/)).textContent).toContain("não foi alterado");
    expect(messageBox().value).toBe("Corrigir checkout");
  });

  it("UT-125 appends speech without replacing text typed while processing", async () => {
    const pending = deferred<Response>();
    installDictation({ upload: () => pending.promise });
    renderDictation();
    await startListening();
    await stopListening();
    await userEvent.type(messageBox(), " Preservar IVA");
    await act(async () => pending.resolve(Response.json({ text: "ao remover item" })));
    await waitFor(() => expect(messageBox().value).toBe("Corrigir checkout Preservar IVA ao remover item"));
  });

  it("UT-126 shows an interrupted capture as incomplete, never as transcript", async () => {
    const pending = deferred<Response>();
    installDictation({ upload: () => pending.promise });
    renderDictation();
    await startListening();
    await stopListening();
    act(() => setVisibility("hidden"));
    await act(async () => pending.reject(new TypeError("Failed to fetch")));
    expect((await screen.findByRole("alert")).textContent).toContain("interrompida antes de terminar");
    expect(messageBox().value).toBe("Corrigir checkout");
  });

  it("UT-127 extends the same unsent input once per capture", async () => {
    const media = installDictation();
    renderDictation();
    await startListening();
    await stopListening();
    await waitFor(() => expect(messageBox().value).toBe("Corrigir checkout ao remover item"));
    media.upload.mockImplementation(transcript("no checkout"));
    await startListening("");
    await stopListening();
    await waitFor(() => expect(messageBox().value).toBe("Corrigir checkout ao remover item no checkout"));
    expect(media.upload).toHaveBeenCalledTimes(2);
  });

  it("UT-129 keeps an abandoned transcript out of the next task's input", async () => {
    const pending = deferred<Response>();
    installDictation({ upload: () => pending.promise });
    const view = renderDictation({ scope: { projectId: P, taskId: T, expectedVersion: 7 } });
    await startListening();
    await stopListening();
    view.rerender(<DictationHarness key={U} scope={{ projectId: P, taskId: U, expectedVersion: 3 }} onSend={view.onSend} />);
    await act(async () => pending.resolve(Response.json({ text: "ao remover item" })));
    expect(messageBox().value).toBe("");
    expect(view.onSend).not.toHaveBeenCalled();
  });
});
