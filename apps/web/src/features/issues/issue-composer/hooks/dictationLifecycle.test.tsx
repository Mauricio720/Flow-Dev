import { act, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DictationHarness, messageBox, renderDictation, startListening } from "@/test/dictationHarness";
import { installDictation, setVisibility } from "@/test/media";
import { P, P2, T, U } from "@/test/tasks";

type View = ReturnType<typeof renderDictation>;

const TASK_SCOPE = { projectId: P, taskId: T, expectedVersion: 7 };
const TASK_COUNT = 10;

const INTERRUPTIONS: [string, (view: View) => void][] = [
  ["navigation away", (view) => view.unmount()],
  ["task switch", (view) => view.rerender(<DictationHarness key={U} scope={{ projectId: P, taskId: U, expectedVersion: 1 }} />)],
  ["project switch", (view) => view.rerender(<DictationHarness key={P2} scope={{ projectId: P2, taskId: null, expectedVersion: null }} />)],
  ["sign-out or access loss", (view) => view.rerender(<DictationHarness scope={TASK_SCOPE} enabled={false} />)],
  ["pagehide", () => window.dispatchEvent(new Event("pagehide"))],
];

describe("dictation lifecycle", () => {
  it.each(INTERRUPTIONS)("UT-116 stops every track on %s and never restarts", async (_name, interrupt) => {
    const media = installDictation();
    const view = renderDictation({ scope: TASK_SCOPE });
    await startListening();
    act(() => interrupt(view));
    await waitFor(() => expect(media.tracks[0].stop).toHaveBeenCalled());
    expect(media.getUserMedia).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Parar ditado" })).toBeNull();
  });

  it("UT-103 ends a listening capture as incomplete when the page is hidden", async () => {
    const media = installDictation();
    renderDictation();
    await startListening();
    act(() => setVisibility("hidden"));
    expect((await screen.findByRole("alert")).textContent).toContain("interrompida antes de terminar");
    act(() => setVisibility("visible"));
    expect(media.tracks[0].stop).toHaveBeenCalled();
    expect(media.getUserMedia).toHaveBeenCalledTimes(1);
    expect(messageBox().value).toBe("Corrigir checkout");
  });

  it("UT-120 leaves only the current input owning active tracks after ten task switches", async () => {
    const media = installDictation();
    const view = renderDictation({ scope: { projectId: P, taskId: "task-0", expectedVersion: 1 } });
    await startListening("");
    for (let index = 1; index < TASK_COUNT; index++) {
      view.rerender(<DictationHarness key={index} scope={{ projectId: P, taskId: `task-${index}`, expectedVersion: 1 }} />);
      await startListening("");
    }
    const stopped = media.tracks.filter((track) => track.stop.mock.calls.length > 0);
    expect(media.tracks).toHaveLength(TASK_COUNT);
    expect(stopped).toHaveLength(TASK_COUNT - 1);
    expect(media.tracks.at(-1)?.stop).not.toHaveBeenCalled();
  });
});
