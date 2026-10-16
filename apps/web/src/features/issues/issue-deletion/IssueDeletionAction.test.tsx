import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({ preview: vi.fn(), start: vi.fn(), status: vi.fn(), retry: vi.fn() }));
vi.mock("@/lib/trpc/client", () => ({ trpc: { issueDeletion: { preview: { query: api.preview }, start: { mutate: api.start }, status: { query: api.status }, retry: { mutate: api.retry } } } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }) }));

import { IssueDeletionAction } from "./IssueDeletionAction";

const target = { kind: "task" as const, projectId: "10000000-0000-4000-8000-000000000001", taskId: "20000000-0000-4000-8000-000000000001" };

describe("IssueDeletionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.preview.mockResolvedValue({ target, title: "Issue de exemplo", repository: "acme/app", issueNumber: null, destinations: ["flow_dev"], canDelete: true, fingerprint: "a".repeat(64), deleteReason: null });
  });

  it("UT-022 moves focus into the dialog and restores it on Escape without starting deletion", async () => {
    render(<IssueDeletionAction target={target} returnTo="/projects" />);
    const trigger = await screen.findByRole("button", { name: "Excluir issue" });
    trigger.focus();
    fireEvent.click(trigger);
    const heading = screen.getByRole("heading", { name: "Excluir issue permanentemente?" });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(api.start).not.toHaveBeenCalled();
  });
});
