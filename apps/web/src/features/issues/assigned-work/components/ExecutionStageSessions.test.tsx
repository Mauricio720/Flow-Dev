import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { detailWith, eventOf, sessionOf } from "@/test/execution";
import { messageOf, timelineOf } from "@/test/session";
import { ExecutionStage } from "./ExecutionStage";

const timeline = vi.mocked(trpc.tasks.session.timeline.query);
const FLOW_DEV_UNCONFIRMED = "O Flow Dev não conseguiu iniciar a sessão. Confira se o serviço de sessões está rodando.";
const TERMINAL_UNCONFIRMED = "Não confirmada: o Flow Dev não recebeu sinal do Claude. Confira a janela do terminal.";

const stageOf = (sessions: ReturnType<typeof sessionOf>[], reader = false) => <ExecutionStage detail={detailWith(sessions)} reader={reader} />;

describe("ExecutionStage sessions by runtime", () => {
  it("V-28h marks a session opened in the terminal and shows only its events, with no message field", () => {
    render(stageOf([sessionOf({ runtime: "terminal", events: [eventOf()] })]));
    expect(screen.getByText("Aberta no terminal")).toBeTruthy();
    expect(screen.getByRole("list", { name: "Eventos da sessão" })).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(timeline).not.toHaveBeenCalled();
  });

  it("V-28h lists an old terminal session in the history as Aberta no terminal, with its events and no field", async () => {
    timeline.mockResolvedValue(timelineOf());
    const old = sessionOf({ id: "s2", runtime: "terminal", status: "ended", userName: "Bruno", events: [eventOf({ summary: "git status" })] });
    render(stageOf([sessionOf({ id: "s1", runtime: "flow_dev" }), old]));
    await act(async () => undefined);
    const history = screen.getByRole("list", { name: "Sessões anteriores" });
    expect(within(history).getByText(/Aberta no terminal/)).toBeTruthy();
    await userEvent.click(within(history).getByRole("button", { name: /Bruno/ }));
    expect(within(history).getByText("Rodou: git status")).toBeTruthy();
    expect(within(history).queryByRole("textbox")).toBeNull();
  });

  it("V-28i shows the Flow Dev message for a Flow Dev session that was not confirmed and the Spec B message for a terminal one", async () => {
    timeline.mockResolvedValue(timelineOf({ status: "unconfirmed" }));
    const { unmount } = render(stageOf([sessionOf({ runtime: "flow_dev", status: "unconfirmed" })]));
    await act(async () => undefined);
    expect(screen.getByText(FLOW_DEV_UNCONFIRMED)).toBeTruthy();
    expect(screen.queryByText(TERMINAL_UNCONFIRMED)).toBeNull();
    unmount();
    render(stageOf([sessionOf({ runtime: "terminal", status: "unconfirmed" })]));
    expect(screen.getByText(TERMINAL_UNCONFIRMED)).toBeTruthy();
  });

  it("shows the conversation of the latest Flow Dev session under the neutral session name", async () => {
    timeline.mockResolvedValue(timelineOf({ entries: [messageOf()] }));
    render(stageOf([sessionOf({ runtime: "flow_dev" })]));
    await act(async () => undefined);
    expect(screen.getByRole("region", { name: "Sessão do agente" })).toBeTruthy();
    expect(screen.getByText("Vou começar pela análise.")).toBeTruthy();
    expect(screen.queryByText("Aberta no terminal")).toBeNull();
  });

  it("loads the conversation of an earlier Flow Dev session only when it is expanded, read-only for a reader", async () => {
    timeline.mockResolvedValue(timelineOf({ status: "ended", canControl: false, entries: [messageOf({ content: "Conversa antiga" })] }));
    const earlier = sessionOf({ id: "s2", runtime: "flow_dev", status: "ended", userName: "Carla" });
    render(stageOf([sessionOf({ id: "s1", runtime: "terminal" }), earlier], true));
    expect(timeline).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /Carla/ }));
    expect(await screen.findByText("Conversa antiga")).toBeTruthy();
    expect(timeline).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "s2" }));
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("tells a reader that the operator is awaited when the Flow Dev session needs a person", async () => {
    timeline.mockResolvedValue(timelineOf({ status: "asking", canControl: false }));
    render(stageOf([sessionOf({ runtime: "flow_dev", status: "asking" })], true));
    await act(async () => undefined);
    expect(screen.getByText("Aguardando a pessoa operadora")).toBeTruthy();
    expect(screen.queryByText("Precisa de você")).toBeNull();
  });
});
