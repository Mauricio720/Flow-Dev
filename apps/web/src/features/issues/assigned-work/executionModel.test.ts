import { describe, expect, it } from "vitest";
import { artifactOf, detailWith, eventOf, sessionOf } from "@/test/execution";
import { snapshotOf } from "@/test/work";
import { publishedDetail } from "@/test/tasks";
import { eventLabel, executionTabState, hasActiveSession, latestSession, sessionStatusLabel } from "./executionModel";
import { timelineEntries } from "./planningModel";
import { initialWorkState, workPollInterval } from "./workState";

const pollOf = (detail: ReturnType<typeof publishedDetail>) => workPollInterval(initialWorkState({ kind: "ready", snapshot: snapshotOf({}, detail) }));

describe("execution model", () => {
  it("V-08k polls every 3 s while a session is active, 15 s with only ended ones and 2 s while planning", () => {
    for (const status of ["running", "waiting", "opening", "unconfirmed"] as const) expect(pollOf(detailWith([sessionOf({ status })]))).toBe(3_000);
    expect(pollOf(detailWith([sessionOf({ status: "ended" }), sessionOf({ status: "launch_failed" })]))).toBe(15_000);
    const planning = { ...publishedDetail().planning, status: "in_progress" as const };
    expect(pollOf({ ...detailWith([sessionOf({ status: "running" })]), planning })).toBe(2_000);
  });

  it("V-08l shows the execution entry on the timeline only when there is a session, with the latest state", () => {
    const base = publishedDetail();
    expect(timelineEntries(base).map((entry) => entry.key)).not.toContain("execution");
    const entries = timelineEntries(detailWith([sessionOf({ status: "waiting", userName: "Bruno" })]));
    expect(entries.at(-1)).toMatchObject({ key: "execution", label: "Sessão do agente", actor: "Bruno", state: "current", detail: "Aguardando você" });
  });

  it("shows the reader label on the timeline entry when the viewer only reads", () => {
    const detail = detailWith([sessionOf({ status: "waiting" })]);
    expect(timelineEntries(detail, { reader: true }).at(-1)?.detail).toBe("Aguardando a pessoa operadora");
    expect(timelineEntries(detail, { reader: false }).at(-1)?.detail).toBe("Aguardando você");
  });

  it("finds the latest session and whether any is active", () => {
    const detail = detailWith([sessionOf({ id: "novo", status: "ended" }), sessionOf({ id: "velho", status: "running" })]);
    expect(latestSession(detail)?.id).toBe("novo");
    expect(hasActiveSession(detail)).toBe(true);
    expect(latestSession(detailWith([]))).toBeNull();
  });

  it("maps each state to a tab state and to the exact label", () => {
    expect(executionTabState(sessionOf({ status: "waiting" }))).toBe("yours");
    expect(executionTabState(sessionOf({ status: "unconfirmed" }))).toBe("failed");
    expect(sessionStatusLabel(sessionOf({ status: "waiting" }), { reader: true })).toBe("Aguardando a pessoa operadora");
    expect(sessionStatusLabel(sessionOf({ status: "unconfirmed" }), { reader: false })).toBe("Não confirmada: o Flow Dev não recebeu sinal do Claude. Confira a janela do terminal.");
  });

  it("builds the verb of each event from its kind", () => {
    expect(eventLabel(eventOf({ kind: "file_edit", summary: "src/a.ts" }))).toBe("Editou src/a.ts");
    expect(eventLabel(eventOf({ kind: "command", summary: "pnpm test" }))).toBe("Rodou: pnpm test");
    expect(eventLabel(eventOf({ kind: "waiting", summary: "" }), { reader: true })).toBe("Aguardando a pessoa operadora");
    expect(artifactOf().path).toBe("docs/specs/login/spec.md");
  });
});
