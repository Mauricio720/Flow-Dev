import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { TARGET } from "@/test/spec";
import { SpecActivity } from "./SpecActivity";

const entry = (patch: Record<string, unknown> = {}) => ({ id: "e1", sequence: 1, kind: "tool_result", attemptId: "r", toolCallId: "c1", text: "ok", preview: "ok", result: null, status: null, source: null, durationMs: null, reason: null, omitted: [], tool: "read", hasFullText: false, ...patch }) as never;
const render1 = (entries: never[], queued = false) => render(<SpecActivity entries={entries} queued={queued} target={TARGET} hasOlder={false} onLoadOlder={() => undefined} />);

describe("SpecActivity", () => {
  it("IT-022 shows queued text without fabricated activity or percentages", () => {
    render1([], true);
    expect(screen.getByRole("status").textContent).toContain("Na fila");
    expect(document.body.textContent).not.toMatch(/\d+\s?%/);
  });

  it("UT-043 renders a failed tool outcome with its recorded reason", () => {
    render1([entry({ status: "failed", reason: "permission_denied" })]);
    expect(screen.getByText(/Falhou: permission_denied/)).toBeTruthy();
  });

  it("UT-044 omits a missing duration instead of inventing a number", () => {
    render1([entry({ status: "completed" })]);
    expect(document.body.textContent).not.toMatch(/\bms\b/);
    render1([entry({ id: "e2", durationMs: 42 })]);
    expect(screen.getByText(/42 ms/)).toBeTruthy();
  });

  it("IT-023 shows the 16 KiB preview and loads all 20,000 saved bytes on demand", async () => {
    const preview = "p".repeat(16 * 1024);
    const full = "x".repeat(20_000);
    mockEventDetail(full);
    render1([entry({ kind: "agent_message", text: preview, preview, hasFullText: true })]);
    expect(screen.getByText(preview)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ver mensagem completa" }));
    await waitFor(() => expect(screen.getByText(full)).toBeTruthy());
  });

  it("renders agent text as inert text, never as markup", () => {
    render1([entry({ kind: "agent_message", text: "<img src=x onerror=alert(1)>", preview: "<img src=x onerror=alert(1)>" })]);
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeTruthy();
  });
});

function mockEventDetail(text: string) {
  (trpc.taskSpec.event.query as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue({ id: "e1", payload: { text } });
}
