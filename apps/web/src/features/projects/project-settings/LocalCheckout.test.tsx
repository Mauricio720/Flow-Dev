import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { LocalCheckout } from "@/lib/projects/contract";
import { trpc } from "@/lib/trpc/client";
import { P1, agentSettingsOf, trpcFailure } from "@/test/projects";
import { ProjectSettings } from "./index";

const save = vi.mocked(trpc.projects.localCheckout.save.mutate);
const remove = vi.mocked(trpc.projects.localCheckout.remove.mutate);
const LINKED: LocalCheckout = { path: "/home/ana/Área de trabalho/shop", verifiedAt: "2026-11-22T14:30:00.000Z", version: 1 };

function renderSettings(canEdit: boolean, localCheckout: LocalCheckout = null) {
  render(<ProjectSettings project={P1} canEdit={canEdit} agentSettings={agentSettingsOf()} localCheckout={localCheckout} />);
  return screen.getByRole("form", { name: "Meu repositório local" });
}

describe("local checkout section", () => {
  it("V-01m shows the linked folder with the verification note", () => {
    renderSettings(false, LINKED);
    expect(screen.getByText(LINKED!.path)).toBeTruthy();
    expect(screen.getByText(/^Verificada em /)).toBeTruthy();
    expect((screen.getByLabelText("Pasta do clone") as HTMLInputElement).value).toBe(LINKED!.path);
  });

  it("V-01m shows an empty field and the save button when nothing is linked", () => {
    renderSettings(false);
    expect((screen.getByLabelText("Pasta do clone") as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("button", { name: "Salvar pasta" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remover vínculo" })).toBeNull();
  });

  it("V-01n shows the server refusal in an alert and keeps the saved folder", async () => {
    const message = "Esta pasta não é um clone de acme/private. Remotes encontrados: acme/blog.";
    save.mockRejectedValue(Object.assign(new Error(message), { data: { code: "BAD_REQUEST" } }));
    renderSettings(true, LINKED);
    await userEvent.clear(screen.getByLabelText("Pasta do clone"));
    await userEvent.type(screen.getByLabelText("Pasta do clone"), "/home/ana/blog");
    await userEvent.click(screen.getByRole("button", { name: "Salvar pasta" }));
    expect((await screen.findByRole("alert")).textContent).toBe(message);
    expect(save).toHaveBeenCalledWith({ projectId: "p1", path: "/home/ana/blog", expectedVersion: 1 });
    expect(screen.getByText(LINKED!.path)).toBeTruthy();
  });

  it("V-01o removes the link for a member who is not an admin", async () => {
    remove.mockResolvedValue({ removed: true });
    renderSettings(false, LINKED);
    await userEvent.click(screen.getByRole("button", { name: "Remover vínculo" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith({ projectId: "p1" }));
    expect(await screen.findByText("Nenhuma pasta vinculada ainda.")).toBeTruthy();
    expect((screen.getByLabelText("Pasta do clone") as HTMLInputElement).value).toBe("");
  });

  it("saves a new folder with expected version 0 and shows the verification", async () => {
    save.mockResolvedValue(LINKED);
    renderSettings(false);
    await userEvent.type(screen.getByLabelText("Pasta do clone"), LINKED!.path);
    await userEvent.click(screen.getByRole("button", { name: "Salvar pasta" }));
    expect(await screen.findByText("Pasta salva.")).toBeTruthy();
    expect(save).toHaveBeenCalledWith({ projectId: "p1", path: LINKED!.path, expectedVersion: 0 });
    expect(screen.getByText(/^Verificada em /)).toBeTruthy();
  });

  it("falls back to a generic message for an unexpected failure", async () => {
    save.mockRejectedValue(trpcFailure("INTERNAL_SERVER_ERROR"));
    renderSettings(false);
    await userEvent.type(screen.getByLabelText("Pasta do clone"), "/x");
    await userEvent.click(screen.getByRole("button", { name: "Salvar pasta" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível salvar agora");
  });
});
