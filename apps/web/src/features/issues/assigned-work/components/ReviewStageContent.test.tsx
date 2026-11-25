import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buttonNames, mount, POLL_MS, serve } from "@/test/reviewStage";
import { EXECUTE_SESSION_ID, REVIEW_SESSION_ID, cycleOf, reviewOf, roundOf } from "@/test/review";
import { timelineOf } from "@/test/session";
import { taskApi } from "@/test/taskApi";

const reviewApi = taskApi.review;

beforeEach(() => {
  reviewApi.get.query.mockReset();
  taskApi.session.timeline.query.mockReset().mockResolvedValue(timelineOf());
});

describe("ReviewStage content", () => {
  it("V-11c lists the rounds from the latest with verdict and report link, the partial mark and both choices", async () => {
    const rounds = [roundOf(3), roundOf(2), roundOf(1, { verdict: "approved" })];
    serve(cycleOf({ state: "reviewing", round: 3, partial: true, rounds }));
    taskApi.artifacts.get.query.mockReset().mockResolvedValue({ path: rounds[2]!.reportPath!, version: 1, skill: "review", sessionId: null, capturedAt: "2026-11-25T10:00:00.000Z", content: "# Relatório" });
    taskApi.artifacts.list.query.mockReset().mockResolvedValue([]);
    mount([]);
    const list = await screen.findByRole("list", { name: "Rodadas" });
    const items = within(list).getAllByRole("listitem").map((item) => item.textContent);
    expect(items).toEqual(["Rodada 3Reprovadareview-003.md", "Rodada 2Reprovadareview-002.md", "Rodada 1Aprovadareview-001.md"]);
    expect(screen.getByText("Parcial")).toBeTruthy();
    expect(screen.getByText("Revisão:").nextSibling?.textContent).toBe("Claude Code · Opus · Máximo");
    expect(screen.getByText("Execução:").nextSibling?.textContent).toBe("Claude Code · Opus · Máximo");
    await userEvent.click(within(list).getByRole("button", { name: "review-001.md" }));
    await waitFor(() => expect(taskApi.artifacts.get.query).toHaveBeenCalledWith(expect.objectContaining({ artifactId: rounds[2]!.reportArtifactId })));
  });

  it("V-11d shows the conversation of the session of the turn and swaps it when the turn changes", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    reviewApi.get.query.mockResolvedValueOnce(reviewOf(cycleOf({ state: "reviewing", step: { role: "review", sessionId: REVIEW_SESSION_ID, sessionStatus: "running" } }))).mockResolvedValue(reviewOf(cycleOf({ state: "executing", step: { role: "execute", sessionId: EXECUTE_SESSION_ID, sessionStatus: "running" } })));
    mount();
    await act(async () => undefined);
    expect(taskApi.session.timeline.query).toHaveBeenLastCalledWith(expect.objectContaining({ sessionId: REVIEW_SESSION_ID }));
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_MS); });
    expect(taskApi.session.timeline.query).toHaveBeenLastCalledWith(expect.objectContaining({ sessionId: EXECUTE_SESSION_ID }));
    vi.useRealTimers();
  });
});

describe("ReviewStage readers", () => {
  it("V-11e tells a member nothing started and shows no button", async () => {
    serve(null);
    mount([], true);
    expect((await screen.findAllByText("A revisão ainda não começou."))).toHaveLength(1);
    expect(screen.queryAllByRole("button")).toEqual([]);
  });

  it("V-11e shows a member the caveats state and rounds without any action button", async () => {
    serve(cycleOf({ state: "caveats", round: 2, rounds: [roundOf(1), roundOf(2, { verdict: "caveats" })] }));
    mount([], true);
    expect(await screen.findByText("Aprovada com ressalvas na rodada 2. Aceite as ressalvas ou peça mais uma correção.")).toBeTruthy();
    expect(within(screen.getByRole("list", { name: "Rodadas" })).getAllByRole("listitem")).toHaveLength(2);
    expect(buttonNames(screen.getByRole("region", { name: "Revisão da feature" }))).toEqual(["review-002.md", "review-001.md"]);
  });

  it("V-11e tells a member the operator is awaited when the session has a pending question", async () => {
    serve(cycleOf({ state: "reviewing", round: 2, step: { role: "review", sessionId: null, sessionStatus: "asking" } }));
    mount([], true);
    expect(await screen.findByText("Rodada 2 · Aguardando a pessoa operadora")).toBeTruthy();
  });
});

