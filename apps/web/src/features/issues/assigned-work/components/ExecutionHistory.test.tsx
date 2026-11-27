import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { codexSessionOf, detailWith, eventOf, sessionOf } from "@/test/execution";
import { ExecutionStage } from "./ExecutionStage";

const attachments = [
  { name: "nota.md", contentType: "text/markdown", byteSize: 6, availableUntil: "2026-11-29T12:00:00.000Z", removed: false },
  { name: "print.png", contentType: "image/png", byteSize: 11, availableUntil: null, removed: true },
];
const previous = [
  sessionOf({ id: "s2", status: "ended", userName: "Bruno", route: "prd", openedAt: "2026-11-20T10:00:00.000Z", endedAt: "2026-11-20T11:00:00.000Z", events: [eventOf({ kind: "command", summary: "git status" })], attachments }),
  sessionOf({ id: "s3", status: "ended", userName: "Carla", openedAt: "2026-11-19T10:00:00.000Z", endedAt: "2026-11-19T11:00:00.000Z" }),
];
const staged = (reader = false) => <ExecutionStage detail={detailWith([sessionOf({ id: "s1", events: [eventOf()] }), ...previous])} reader={reader} />;

describe("ExecutionHistory", () => {
  it("V-08q lists previous sessions and expands one by keyboard to show events and attachments", async () => {
    render(staged());
    const history = screen.getByRole("list", { name: "Sessões anteriores" });
    expect(within(history).getAllByRole("button")).toHaveLength(2);
    expect(within(history).getByText("Bruno")).toBeTruthy();
    expect(within(history).getByText("Carla")).toBeTruthy();
    const toggle = within(history).getByRole("button", { name: /Bruno/ });
    toggle.focus();
    await userEvent.keyboard("{Enter}");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(within(history).getByText("Rodou: git status")).toBeTruthy();
    expect(within(history).getByText(/nota\.md · text\/markdown · 6 B · disponível até 29\/11/)).toBeTruthy();
    expect(within(history).getByText("print.png · image/png · 11 B · removido")).toBeTruthy();
    await userEvent.keyboard(" ");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("V-08r gives a reader the stage, events and history with no button besides the expanders", () => {
    render(staged(true));
    expect(screen.getByRole("list", { name: "Eventos da sessão" })).toBeTruthy();
    const buttons = screen.getAllByRole("button");
    expect(buttons.every((button) => button.hasAttribute("aria-expanded"))).toBe(true);
    expect(screen.queryByText("Aguardando você")).toBeNull();
  });

  it("V-08r tells a reader that the operator is awaited", () => {
    render(<ExecutionStage detail={detailWith([sessionOf({ status: "waiting" })])} reader />);
    expect(screen.getByText("Aguardando a pessoa operadora")).toBeTruthy();
  });

  it("V-40s shows the agent, the model and the effort of a plan session in the history, and nothing for a route session", () => {
    const sessions = [
      sessionOf({ id: "s1", status: "running" }),
      sessionOf({ id: "s2", status: "ended", userName: "Bruno", purpose: "plan_item", model: "sonnet", effort: "high", endedAt: "2026-11-20T11:00:00.000Z" }),
      sessionOf({ id: "s3", status: "ended", userName: "Carla", endedAt: "2026-11-19T11:00:00.000Z" }),
    ];
    render(<ExecutionStage detail={detailWith(sessions)} reader={false} />);
    const history = screen.getByRole("list", { name: "Sessões anteriores" });
    const [plan, route] = within(history).getAllByRole("button");
    expect(plan!.textContent).toContain("Claude Code · Sonnet · Alto");
    expect(route!.textContent).not.toMatch(/Claude Code|Opus|Sonnet|Haiku/);
  });

  it("V-51h shows Codex model and effort in route, generation and plan history", () => {
    const purposes = ["route", "generate_tasks", "plan_item"] as const;
    const history = purposes.map((purpose, index) => codexSessionOf({ id: `codex-${index}`, status: "ended", purpose, userName: `Pessoa ${index}`, endedAt: "2026-11-20T11:00:00.000Z" }));
    render(<ExecutionStage detail={detailWith([sessionOf({ id: "active" }), ...history])} reader />);
    const rows = within(screen.getByRole("list", { name: "Sessões anteriores" })).getAllByRole("button");
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.textContent?.includes("Codex · gpt-6.1-sol · Alto"))).toBe(true);
  });

  it("V-13f lists review and review_execute sessions in the history with their events, like the others", async () => {
    const sessions = [
      sessionOf({ id: "s1", status: "running" }),
      sessionOf({ id: "s2", status: "ended", userName: "Bruno", purpose: "review_execute", model: "opus", effort: "max", events: [eventOf({ summary: "pnpm lint" })], endedAt: "2026-11-20T11:00:00.000Z" }),
      sessionOf({ id: "s3", status: "ended", userName: "Carla", purpose: "review", model: "sonnet", effort: "high", events: [eventOf({ summary: "git diff" })], endedAt: "2026-11-19T11:00:00.000Z" }),
    ];
    render(<ExecutionStage detail={detailWith(sessions)} reader={false} />);
    const history = screen.getByRole("list", { name: "Sessões anteriores" });
    const [execute, review] = within(history).getAllByRole("button");
    expect(execute!.textContent).toContain("Claude Code · Opus · Máximo");
    expect(review!.textContent).toContain("Claude Code · Sonnet · Alto");
    await userEvent.click(review!);
    expect(within(history).getByText("Rodou: git diff")).toBeTruthy();
  });

  it("V-08j shows the switched route with an arrow and keeps the route alone for a session without a switch", () => {
    const sessions = [
      sessionOf({ id: "s1", status: "running" }),
      sessionOf({ id: "s2", status: "ended", userName: "Ana", route: "prd", switchedTo: "direct_execution", endedAt: "2026-11-20T11:00:00.000Z" }),
      sessionOf({ id: "s3", status: "ended", userName: "Bruno", route: "prd", switchedTo: null, endedAt: "2026-11-19T11:00:00.000Z" }),
    ];
    render(<ExecutionStage detail={detailWith(sessions)} reader />);
    const [switched, kept] = within(screen.getByRole("list", { name: "Sessões anteriores" })).getAllByRole("button");
    expect(switched!.textContent).toContain("Ana · PRD → Execução direta · ");
    expect(kept!.textContent).toContain("Bruno · PRD · ");
    expect(kept!.textContent).not.toContain("Execução direta");
  });

});
