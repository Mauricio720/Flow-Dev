import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ preview: vi.fn(), confirm: vi.fn() }));
vi.mock("@/lib/trpc/client", () => ({ trpc: { localMachines: { pairingPreview: { query: mocks.preview }, confirmPairing: { mutate: mocks.confirm } } } }));

import { LocalMachinePairing } from "./index";

describe("LocalMachinePairing", () => {
  beforeEach(() => { mocks.preview.mockReset(); mocks.confirm.mockReset(); });

  it("UT-162 shows the safe machine label and confirms only after an explicit action", async () => {
    mocks.preview.mockResolvedValue({ label: "Notebook da Ana", expiresAt: "2026-10-07T12:10:00.000Z" });
    mocks.confirm.mockResolvedValue({ pairingId: "pairing-1", machine: { id: "machine-1" } });
    render(<LocalMachinePairing code="abc123-_" />);
    expect(await screen.findByText("Notebook da Ana")).toBeTruthy();
    expect(mocks.confirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar conexão" }));
    expect(await screen.findByRole("heading", { name: "Conexão confirmada" })).toBeTruthy();
    expect(mocks.confirm).toHaveBeenCalledWith({ code: "abc123-_", requestKey: expect.any(String) });
  });

  it("shows a safe expiry reason without revealing server details", async () => {
    mocks.preview.mockRejectedValue({ data: { reason: "pairing_expired" }, message: "private error detail" });
    render(<LocalMachinePairing code="abc123-_" />);
    expect((await screen.findByRole("alert")).textContent).toContain("Este código expirou");
    expect(screen.queryByText("private error detail")).toBeNull();
  });
});
