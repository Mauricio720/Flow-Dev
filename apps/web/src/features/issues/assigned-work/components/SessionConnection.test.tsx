import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { sessionOf } from "@/test/execution";
import { SESSION_SCOPE, messageOf, timelineOf } from "@/test/session";
import { SessionConversation } from "./SessionConversation";

const timeline = vi.mocked(trpc.tasks.session.timeline.query);
const show = () => render(<SessionConversation scope={SESSION_SCOPE} session={sessionOf({ runtime: "flow_dev" })} reader={false} />);

describe("SessionConversation connection feedback", () => {
  it("checks the session before presenting the saved running state as current", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-25T17:00:00.000Z"));
    let resolve!: (page: ReturnType<typeof timelineOf>) => void;
    timeline.mockImplementation(() => new Promise((done) => { resolve = done; }));
    show();
    expect(screen.getByRole("status").textContent).toBe("Verificando estado da sessão…");
    expect(screen.queryByText("Em andamento")).toBeNull();
    await act(async () => resolve(timelineOf()));
    expect(screen.getByText("Em andamento").textContent).toBe("Em andamento");
    expect(screen.getByText(/Última consulta à sessão/).querySelector("time")?.dateTime).toBe("2026-11-25T17:00:00.000Z");
  });

  it("explains that execution cannot be confirmed when the first request fails", async () => {
    timeline.mockRejectedValue(new Error("Failed to fetch"));
    show();
    await act(async () => undefined);
    expect(screen.getByRole("status").textContent).toContain("Sem atualização da sessão");
    expect(screen.getByRole("status").textContent).toContain("Não é possível confirmar se o agente continua executando.");
    expect(screen.getByText("Último estado registrado: Em andamento").textContent).toBe("Último estado registrado: Em andamento");
    expect(screen.queryByText("Em andamento")).toBeNull();
    expect(screen.queryByText(/Última consulta à sessão/)).toBeNull();
  });

  it("preserves the conversation and last consultation time during failure and recovers automatically", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    timeline.mockResolvedValueOnce(timelineOf({ entries: [messageOf()] })).mockRejectedValueOnce(new Error("offline")).mockResolvedValue(timelineOf({ status: "waiting" }));
    show();
    await act(async () => undefined);
    const checkedAt = screen.getByText(/Última consulta à sessão/).querySelector("time")?.dateTime;
    await act(async () => { await vi.advanceTimersByTimeAsync(1_500); });
    expect(screen.getByText("Último estado registrado: Em andamento").textContent).toBe("Último estado registrado: Em andamento");
    expect(screen.getByText(/Última consulta à sessão/).querySelector("time")?.dateTime).toBe(checkedAt);
    expect(screen.getByText("Vou começar pela análise.").textContent).toBe("Vou começar pela análise.");
    await act(async () => { await vi.advanceTimersByTimeAsync(1_500); });
    expect(screen.queryByText("Sem atualização da sessão")).toBeNull();
    expect(screen.getByText("Aguardando você").textContent).toBe("Aguardando você");
    expect(screen.getByText(/Última consulta à sessão/).querySelector("time")?.dateTime).not.toBe(checkedAt);
  });

  it("lets the person retry immediately and replaces the failed polling loop", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    timeline.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(timelineOf({ status: "ended" }));
    show();
    await act(async () => undefined);
    fireEvent.click(screen.getByRole("button", { name: "Atualizar sessão" }));
    await act(async () => undefined);
    expect(screen.queryByText("Sem atualização da sessão")).toBeNull();
    expect(screen.getByText("Encerrada").textContent).toBe("Encerrada");
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(timeline).toHaveBeenCalledTimes(2);
  });

  it("checks a different session without reusing the previous conversation or status", async () => {
    timeline.mockResolvedValueOnce(timelineOf({ status: "ended", entries: [messageOf()] })).mockImplementation(() => new Promise(() => undefined));
    const { rerender } = show();
    await act(async () => undefined);
    const session = sessionOf({ id: "new-session", runtime: "flow_dev", status: "opening" });
    rerender(<SessionConversation scope={{ ...SESSION_SCOPE, sessionId: session.id }} session={session} reader={false} />);
    expect(screen.getByRole("status").textContent).toBe("Verificando estado da sessão…");
    expect(screen.queryByText("Encerrada")).toBeNull();
    expect(screen.queryByText("Vou começar pela análise.")).toBeNull();
    expect(screen.queryByText(/Última consulta à sessão/)).toBeNull();
  });
});
