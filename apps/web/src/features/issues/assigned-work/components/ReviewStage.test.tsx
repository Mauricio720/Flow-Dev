import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buttonNames, mount, POLL_MS, serve } from "@/test/reviewStage";
import { CYCLE_ID, cycleOf, reviewOf } from "@/test/review";
import { timelineOf } from "@/test/session";
import { taskApi } from "@/test/taskApi";
import { terminalRejection } from "@/test/terminal";
import type { ReviewState } from "../reviewContract";

const reviewApi = taskApi.review;

beforeEach(() => {
  reviewApi.get.query.mockReset();
  reviewApi.request.mutate.mockReset();
  taskApi.session.timeline.query.mockReset().mockResolvedValue(timelineOf());
});

describe("ReviewStage actions", () => {
  it.each([["reviewing", ["Parar revisão"]], ["executing", ["Parar revisão"]], ["caveats", ["Aceitar ressalvas", "Pedir correção"]], ["failed", ["Tentar de novo", "Encerrar revisão"]]] as [ReviewState, string[]][])("V-11a offers only the actions of %s", async (state, expected) => {
    serve(cycleOf({ state, failure: "A sessão foi interrompida ou encerrada antes de terminar a etapa.", step: { role: "review", sessionId: null, sessionStatus: null } }));
    mount([]);
    const region = await screen.findByRole("region", { name: "Revisão da feature" });
    expect(buttonNames(region)).toEqual(expected);
  });

  it.each(["approved", "accepted", "stopped"] as ReviewState[])("V-11a shows the start form after %s", async (state) => {
    serve(cycleOf({ state }));
    mount([]);
    expect(await screen.findByRole("button", { name: "Iniciar revisão" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Revisão" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Parar revisão" })).toBeNull();
  });

  it("V-11a shows Aplicando… and no action while a request waits for the service", async () => {
    serve(cycleOf({ state: "reviewing", pendingAction: "stop" }));
    mount([]);
    expect(await screen.findByText("Aplicando…")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Parar revisão" })).toBeNull();
  });

  it("V-11a stops after the confirmation, sending the revision that was on screen", async () => {
    serve(cycleOf({ state: "executing", revision: 5 }));
    reviewApi.request.mutate.mockResolvedValue(cycleOf({ pendingAction: "stop" }));
    mount([]);
    await userEvent.click(await screen.findByRole("button", { name: "Parar revisão" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Parar a revisão" }));
    await waitFor(() => expect(reviewApi.request.mutate).toHaveBeenCalledWith(expect.objectContaining({ cycleId: CYCLE_ID, revision: 5, action: "stop" })));
  });

  it("V-11a tells the operator the review changed and reads again", async () => {
    serve(cycleOf({ state: "failed", failure: "motivo" }));
    reviewApi.request.mutate.mockRejectedValue(terminalRejection("review_cycle_changed", "A revisão mudou. Veja o estado atual.", "CONFLICT"));
    mount([]);
    await userEvent.click(await screen.findByRole("button", { name: "Tentar de novo" }));
    expect((await screen.findByRole("alert")).textContent).toBe("A revisão mudou. Veja o estado atual.");
    expect(reviewApi.get.query.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe("ReviewStage accessibility", () => {
  afterEach(() => vi.useRealTimers());

  it("V-11g announces the change of step inside a polite live region", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    reviewApi.get.query.mockResolvedValueOnce(reviewOf(cycleOf({ state: "reviewing" }))).mockResolvedValue(reviewOf(cycleOf({ state: "executing" })));
    mount([]);
    await act(async () => undefined);
    const live = screen.getByText(/Rodada 1 · Revisando/).closest("[aria-live]");
    expect(live?.getAttribute("aria-live")).toBe("polite");
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_MS); });
    expect(live?.textContent).toContain("Rodada 1 · Executando com Claude Code · Opus · Máximo");
    for (const button of screen.getAllByRole("button")) expect(button.textContent?.trim() || button.getAttribute("aria-label")).toBeTruthy();
  });
});
