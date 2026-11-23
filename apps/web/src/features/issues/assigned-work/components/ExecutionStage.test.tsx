import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { detailWith, eventOf, sessionOf } from "@/test/execution";
import { ExecutionStage } from "./ExecutionStage";

const stageOf = (session = sessionOf(), reader = false) => <ExecutionStage detail={detailWith([session])} reader={reader} />;

describe("ExecutionStage", () => {
  it.each([
    ["running", "Em andamento"],
    ["waiting", "Aguardando você"],
    ["opening", "Abrindo"],
    ["launch_failed", "Falhou ao abrir"],
    ["unconfirmed", "Não confirmada: o Flow Dev não recebeu sinal do Claude. Confira a janela do terminal."],
  ] as const)("V-08m shows %s as %s", (status, label) => {
    render(stageOf(sessionOf({ status })));
    expect(screen.getByText(label)).toBeTruthy();
  });

  it("V-08m shows Encerrada with the end time", () => {
    const { container } = render(stageOf(sessionOf({ status: "ended", endedAt: "2026-11-22T13:30:00.000Z" })));
    expect(screen.getByText(/Encerrada/)).toBeTruthy();
    expect(container.querySelector("time[datetime='2026-11-22T13:30:00.000Z']")).not.toBeNull();
  });

  it("V-08n lists the edit and the command, the hidden events and the dropped events", () => {
    const events = [eventOf({ kind: "file_edit", summary: "src/components/LoginButton.tsx" }), eventOf({ kind: "command", summary: "pnpm test" })];
    render(stageOf(sessionOf({ events, hiddenEvents: 5, droppedEvents: 1 })));
    const list = screen.getByRole("list", { name: "Eventos da sessão" });
    expect(within(list).getByText("Editou src/components/LoginButton.tsx")).toBeTruthy();
    expect(within(list).getByText("Rodou: pnpm test")).toBeTruthy();
    expect(within(list).getAllByText(/\d{2}\/\d{2}/)).toHaveLength(2);
    expect(screen.getByText("5 eventos anteriores não exibidos")).toBeTruthy();
    expect(screen.getByText("1 evento não registrado")).toBeTruthy();
  });

  it("V-08o shows the silence start beside the state without changing it", () => {
    const { rerender } = render(stageOf(sessionOf({ status: "waiting", silentSince: "2026-11-22T12:00:00.000Z" })));
    expect(screen.getByText(/Sem sinal desde/)).toBeTruthy();
    expect(screen.getByText("Aguardando você")).toBeTruthy();
    rerender(stageOf(sessionOf({ status: "waiting", silentSince: null })));
    expect(screen.queryByText(/Sem sinal desde/)).toBeNull();
  });

  it("V-08p announces the state in a polite live region that changes with the state", () => {
    const { container, rerender } = render(stageOf(sessionOf({ status: "running" })));
    const region = () => container.querySelector("[aria-live='polite']");
    expect(region()?.textContent).toBe("Em andamento");
    rerender(stageOf(sessionOf({ status: "waiting" })));
    expect(region()?.textContent).toBe("Aguardando você");
  });
});
