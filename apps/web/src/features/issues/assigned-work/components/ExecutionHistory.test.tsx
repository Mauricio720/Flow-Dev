import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { detailWith, eventOf, sessionOf } from "@/test/execution";
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
});
