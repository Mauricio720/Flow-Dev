import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { detailWith, sessionOf } from "@/test/execution";
import { ExecutionStage } from "./ExecutionStage";

describe("ExecutionHistory accounts", () => {
  it("V-11f shows the account of each session: own with the removed suffix, someone else's and the default login", () => {
    const sessions = [
      sessionOf({ id: "s1", status: "running", account: { kind: "own", label: "Trabalho", removed: false } }),
      sessionOf({ id: "s2", status: "ended", userName: "Ana", account: { kind: "own", label: "Codex A", removed: true }, endedAt: "2026-11-21T11:00:00.000Z" }),
      sessionOf({ id: "s3", status: "ended", userName: "Bruno", account: { kind: "other", label: null, removed: false }, endedAt: "2026-11-20T11:00:00.000Z" }),
      sessionOf({ id: "s4", status: "ended", userName: "Carla", account: { kind: "default", label: null, removed: false }, endedAt: "2026-11-19T11:00:00.000Z" }),
    ];
    render(<ExecutionStage detail={detailWith(sessions)} reader />);
    expect(screen.getByText("Conta: Trabalho")).toBeTruthy();
    const [own, other, standard] = within(screen.getByRole("list", { name: "Sessões anteriores" })).getAllByRole("button");
    expect(own!.textContent).toMatch(/ · Codex A \(removida\)$/);
    expect(other!.textContent).toMatch(/ · Conta pessoal da pessoa operadora$/);
    expect(standard!.textContent).toMatch(/ · Login padrão$/);
  });
});
