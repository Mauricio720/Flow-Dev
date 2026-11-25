import { act, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { serveTask } from "@/test/taskApi";
import { loadOf, publishedDetail } from "@/test/tasks";
import { renderWorkspace } from "@/test/workspaceHarness";
import type { TaskDetail } from "../contract";

const POLL_INTERVAL_MS = 15_000;
const PENDING_TEXT = "Atribuindo a você e colocando em Ready…";
const READY_TEXT = "Atribuída a você e colocada em Ready. Ela já aparece em Trabalho atribuído, em “Atribuídas a você em Ready”, para você reivindicar.";

function withAssignment(state: "pending" | "ready"): TaskDetail {
  const detail = publishedDetail();
  return { ...detail, publication: { ...detail.publication!, readyAssignment: { state } } };
}

describe("PublishedResult re-reading", () => {
  afterEach(() => vi.useRealTimers());

  it("V-09c replaces the pending text with the final one on the next re-read, without reloading", async () => {
    vi.useFakeTimers();
    serveTask(withAssignment("pending"));
    renderWorkspace(loadOf(withAssignment("pending")));
    expect(screen.getByText(PENDING_TEXT)).toBeTruthy();
    serveTask(withAssignment("ready"));
    await act(async () => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS));
    expect(screen.queryByText(PENDING_TEXT)).toBeNull();
    expect(screen.getByText(READY_TEXT)).toBeTruthy();
  });
});
