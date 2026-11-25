import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { sessionOf } from "@/test/execution";
import { SESSION_SCOPE, messageOf, timelineOf } from "@/test/session";
import { SessionConversation } from "./SessionConversation";

const timeline = vi.mocked(trpc.tasks.session.timeline.query);

describe("SessionConversation polling", () => {
  it("V-28i appends an entry that arrives on the next poll inside the live region and keeps the ones already shown", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    timeline.mockResolvedValueOnce(timelineOf({ entries: [messageOf()], cursor: "c1" })).mockResolvedValue(timelineOf({ entries: [messageOf({ id: "m2", content: "Terminei a análise." })], cursor: "c2" }));
    render(<SessionConversation scope={SESSION_SCOPE} session={sessionOf({ runtime: "flow_dev" })} reader={false} />);
    await act(async () => undefined);
    const list = screen.getByRole("list", { name: "Conversa com o Claude" });
    expect(within(list).queryByText("Terminei a análise.")).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(1_500); });
    expect(within(list).getByText("Terminei a análise.")).toBeTruthy();
    expect(within(list).getByText("Vou começar pela análise.")).toBeTruthy();
    expect(timeline.mock.calls.map(([input]) => input.after)).toEqual([undefined, "c1"]);
  });

  it("refetches the whole conversation once when the session becomes final and then stops polling", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    timeline.mockResolvedValueOnce(timelineOf({ status: "running", cursor: "c1" })).mockResolvedValueOnce(timelineOf({ status: "ended", cursor: "c2" })).mockResolvedValue(timelineOf({ status: "ended", cursor: "c3", entries: [messageOf({ id: "fim", content: "Encerrada." })] }));
    render(<SessionConversation scope={SESSION_SCOPE} session={sessionOf({ runtime: "flow_dev" })} reader={false} />);
    await act(async () => undefined);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_500); });
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(timeline.mock.calls.map(([input]) => input.after)).toEqual([undefined, "c1", undefined]);
    expect(screen.getByText("Encerrada.")).toBeTruthy();
  });

  it("tells the person when the conversation cannot be refreshed and keeps what was shown", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    timeline.mockResolvedValueOnce(timelineOf({ entries: [messageOf()] })).mockRejectedValue(new Error("Failed to fetch"));
    render(<SessionConversation scope={SESSION_SCOPE} session={sessionOf({ runtime: "flow_dev" })} reader={false} />);
    await act(async () => undefined);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_500); });
    expect(screen.getByRole("status").textContent).toContain("Não é possível confirmar se o agente continua executando.");
    expect(screen.getByText("Vou começar pela análise.")).toBeTruthy();
  });
});
