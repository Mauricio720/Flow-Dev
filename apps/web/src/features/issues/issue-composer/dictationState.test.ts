import { describe, expect, it } from "vitest";
import { C } from "@/test/tasks";
import { INITIAL_DICTATION, dictationReducer, type DictationEvent } from "./dictationState";

const TYPED = "Corrigir checkout";
const NEXT_CAPTURE = "00000000-0000-4000-8000-000000000082";

function reduce(events: DictationEvent[]) {
  return events.reduce(dictationReducer, INITIAL_DICTATION);
}

const LISTENING: DictationEvent[] = [{ type: "typed", text: TYPED }, { type: "requested", captureId: C }, { type: "listening", captureId: C }];
const PROCESSING: DictationEvent[] = [...LISTENING, { type: "stopping", captureId: C, reason: null }];

describe("dictation state", () => {
  it("UT-057 appends the completed transcript once after Stop and never submits", () => {
    const state = reduce([...PROCESSING, { type: "transcribed", captureId: C, text: "ao remover item" }]);
    expect(state).toMatchObject({ text: "Corrigir checkout ao remover item", phase: "stopped", captureId: null });
  });

  it("UT-117 ignores a second completion of the same capture", () => {
    const done: DictationEvent = { type: "transcribed", captureId: C, text: "ao remover item" };
    expect(reduce([...PROCESSING, done, done]).text).toBe("Corrigir checkout ao remover item");
  });

  it("UT-118 restores the snapshot on Cancel and ignores the late transcript", () => {
    const state = reduce([...PROCESSING, { type: "typed", text: "outro texto" }, { type: "canceled", captureId: C }, { type: "transcribed", captureId: C, text: "ao remover item" }]);
    expect(state).toMatchObject({ text: TYPED, phase: "canceled" });
  });

  it("UT-122 keeps the input and reports no_speech for an empty transcript", () => {
    expect(reduce([...PROCESSING, { type: "transcribed", captureId: C, text: "  " }])).toMatchObject({ text: TYPED, phase: "stopped", reason: "no_speech" });
  });

  it("UT-125 appends speech to the text typed while processing", () => {
    const state = reduce([...PROCESSING, { type: "typed", text: "Corrigir checkout Preservar IVA" }, { type: "transcribed", captureId: C, text: "ao remover item" }]);
    expect(state.text).toBe("Corrigir checkout Preservar IVA ao remover item");
  });

  it("UT-126 never turns a failed capture into transcript text", () => {
    const state = reduce([...PROCESSING, { type: "failed", captureId: C, reason: "incomplete_capture" }, { type: "transcribed", captureId: C, text: "ao remover" }]);
    expect(state).toMatchObject({ text: TYPED, phase: "failed", reason: "incomplete_capture" });
  });

  it("UT-103 ends a listening capture as incomplete and stays stopped", () => {
    const state = reduce([...LISTENING, { type: "failed", captureId: C, reason: "incomplete_capture" }, { type: "listening", captureId: C }]);
    expect(state).toMatchObject({ phase: "failed", reason: "incomplete_capture", captureId: null });
  });

  it("UT-129 fences a late transcript of an abandoned capture out of the next one", () => {
    const next: DictationEvent[] = [{ type: "canceled", captureId: C }, { type: "requested", captureId: NEXT_CAPTURE }, { type: "listening", captureId: NEXT_CAPTURE }, { type: "stopping", captureId: NEXT_CAPTURE, reason: null }];
    const state = reduce([...PROCESSING, ...next, { type: "transcribed", captureId: C, text: "ao remover item" }]);
    expect(state).toMatchObject({ text: TYPED, phase: "processing", captureId: NEXT_CAPTURE });
  });

  it("ignores a second start while a capture is pending and keeps the limit reason visible", () => {
    expect(reduce([...LISTENING, { type: "requested", captureId: "other" }]).captureId).toBe(C);
    const limited = reduce([...LISTENING, { type: "stopping", captureId: C, reason: "capture_limit" }, { type: "transcribed", captureId: C, text: "fim" }]);
    expect(limited).toMatchObject({ text: "Corrigir checkout fim", reason: "capture_limit" });
  });
});
