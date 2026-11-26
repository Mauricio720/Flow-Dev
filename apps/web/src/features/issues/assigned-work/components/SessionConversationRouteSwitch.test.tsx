import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { sessionOf } from "@/test/execution";
import { SESSION_SCOPE, SWITCH_ID, routeSwitchOf, timelineOf } from "@/test/session";
import { SessionConversation } from "./SessionConversation";

const timeline = vi.mocked(trpc.tasks.session.timeline.query);
const decideRouteSwitch = vi.mocked(trpc.tasks.session.decideRouteSwitch.mutate);
const ALREADY_DECIDED = "Essa proposta já foi decidida.";
const DECIDED_BY_ANA = { decidedBy: "Ana", decidedAt: "2026-11-25T13:06:00.000Z" };

describe("SessionConversation route switch", () => {
  it("V-08g shows the conflict message, reloads the timeline and shows the state it returns when the proposal was already decided", async () => {
    const conflict = Object.assign(new Error(ALREADY_DECIDED), { data: { code: "CONFLICT", reason: "route_switch_decided" } });
    decideRouteSwitch.mockRejectedValue(conflict);
    timeline.mockResolvedValueOnce(timelineOf({ entries: [routeSwitchOf()] })).mockResolvedValue(timelineOf({ entries: [routeSwitchOf({ state: "declined", ...DECIDED_BY_ANA })] }));
    render(<SessionConversation scope={SESSION_SCOPE} session={sessionOf({ runtime: "flow_dev" })} reader={false} />);
    await userEvent.click(await screen.findByRole("button", { name: "Trocar para execução direta" }));
    expect(decideRouteSwitch).toHaveBeenCalledWith({ ...SESSION_SCOPE, proposalId: SWITCH_ID, decision: "confirm", requestKey: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    expect((await screen.findByRole("alert")).textContent).toBe(ALREADY_DECIDED);
    expect(await screen.findByText("Troca recusada por Ana")).toBeTruthy();
    expect(timeline.mock.calls.map(([input]) => input.after)).toEqual([undefined, undefined]);
    expect(screen.queryByRole("button", { name: "Trocar para execução direta" })).toBeNull();
  });

  it("V-08g reuses the same request key when the person retries the same decision after a failure", async () => {
    decideRouteSwitch.mockRejectedValueOnce(new Error("Failed to fetch")).mockResolvedValue({ proposal: routeSwitchOf({ state: "confirmed", ...DECIDED_BY_ANA }).proposal });
    timeline.mockResolvedValue(timelineOf({ entries: [routeSwitchOf()] }));
    render(<SessionConversation scope={SESSION_SCOPE} session={sessionOf({ runtime: "flow_dev" })} reader={false} />);
    await userEvent.click(await screen.findByRole("button", { name: "Trocar para execução direta" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível concluir agora. Tente de novo.");
    await userEvent.click(await screen.findByRole("button", { name: "Trocar para execução direta" }));
    const [first, second] = decideRouteSwitch.mock.calls.map(([input]) => input.requestKey);
    expect(second).toBe(first);
  });

  it("V-08h announces the confirmation in the polite conversation region when the next poll brings the decided card", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    timeline.mockResolvedValueOnce(timelineOf({ entries: [routeSwitchOf()], cursor: "c1" })).mockResolvedValue(timelineOf({ entries: [routeSwitchOf({ state: "confirmed", ...DECIDED_BY_ANA })], cursor: "c2" }));
    render(<SessionConversation scope={SESSION_SCOPE} session={sessionOf({ runtime: "flow_dev" })} reader={false} />);
    await act(async () => undefined);
    const list = screen.getByRole("list", { name: "Conversa com o Claude" });
    expect(list.getAttribute("aria-live")).toBe("polite");
    expect(within(list).getByRole("button", { name: "Trocar para execução direta" })).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(1_500); });
    expect(within(list).getByText("Troca confirmada por Ana")).toBeTruthy();
    expect(within(list).queryByRole("button", { name: "Trocar para execução direta" })).toBeNull();
  });
});
