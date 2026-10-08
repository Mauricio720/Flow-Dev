import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CART_PROJECT } from "@/test/tasks";
import type { FolderRequest, LocalLink, LocalProjectActions, LocalProjectLoad } from "./contract";
import { LocalProjectSettings } from "./index";

const LINK: LocalLink = { linkId: "L1", revision: 3, machineLabel: "Notebook da Ana", projectLabel: "cart", readiness: "ready", readinessCode: null };

function actionsOf(patch: Partial<LocalProjectActions> = {}): LocalProjectActions {
  return { mine: vi.fn(async () => ({ kind: "ready", link: { ...LINK, revision: 4 } }) as LocalProjectLoad), unlink: vi.fn(async () => ({ status: "unlinked", revision: 4 }) as const), requestFolder: vi.fn(async () => ({ status: "opened" }) as const), folderRequest: vi.fn(async (): Promise<FolderRequest | null> => ({ state: "linked", reason: null })), ...patch };
}

function renderSettings(initial: LocalProjectLoad, actions = actionsOf()) {
  render(<LocalProjectSettings project={CART_PROJECT} initial={initial} actions={actions} pollMs={0} />);
  return actions;
}

describe("LocalProjectSettings", () => {
  it("UT-157 shows the safe machine and checkout label with an explicit preparation entry", () => {
    renderSettings({ kind: "ready", link: LINK });
    expect(screen.getByText("Notebook da Ana")).toBeTruthy();
    expect(screen.getByText("cart")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Pronto");
    expect(screen.getByRole("link", { name: "Abrir trabalho para preparar uma ação" }).getAttribute("href")).toBe(`/projects/${CART_PROJECT.id}/work`);
    expect(document.body.textContent).not.toMatch(/\/home\/|[A-Z]:\\/);
  });

  it("UT-158 explains link_changed in Portuguese and keeps the current link until an explicit refresh", async () => {
    const actions = actionsOf({ unlink: vi.fn(async () => ({ status: "rejected", reason: "link_changed" }) as const) });
    renderSettings({ kind: "ready", link: LINK }, actions);
    await userEvent.click(screen.getByRole("button", { name: "Desvincular checkout" }));
    expect((await screen.findByRole("alert")).textContent).toContain("O vínculo mudou em outra sessão");
    expect(screen.getByText("Notebook da Ana")).toBeTruthy();
    expect(actions.mine).not.toHaveBeenCalled();
    expect(actions.unlink).toHaveBeenCalledWith(expect.objectContaining({ linkId: "L1", expectedRevision: 3, requestKey: expect.any(String) }));
    await userEvent.click(screen.getByRole("button", { name: "Atualizar vínculo" }));
    expect(actions.mine).toHaveBeenCalledOnce();
  });

  it("shows the blocked reason without exposing anything but the safe code message", () => {
    renderSettings({ kind: "ready", link: { ...LINK, readiness: "blocked", readinessCode: "machine_unavailable" } });
    expect(screen.getByRole("status").textContent).toBe("Bloqueado");
    expect(screen.getByText(/A máquina vinculada não respondeu/)).toBeTruthy();
  });

  it("explains that there is no link and where it is created", () => {
    renderSettings({ kind: "none" });
    expect(screen.getByRole("heading", { name: "Nenhum checkout vinculado" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /preparar/ })).toBeNull();
  });

  it("explains an environment without the local connector", () => {
    renderSettings({ kind: "unavailable" });
    expect(screen.getByRole("heading", { name: "Vínculo local indisponível" })).toBeTruthy();
  });

  it("links the folder chosen on this computer after one click and shows the new link", async () => {
    let finish: (request: FolderRequest) => void = () => {};
    const folderRequest = vi.fn<LocalProjectActions["folderRequest"]>().mockResolvedValueOnce({ state: "claimed", reason: null }).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const actions = renderSettings({ kind: "none" }, actionsOf({ folderRequest }));
    await userEvent.click(screen.getByRole("button", { name: "Escolher pasta" }));
    expect((await screen.findByText(/A janela de pastas abriu no seu computador/)).getAttribute("role")).toBe("status");
    expect(screen.getByRole("button", { name: "Escolher pasta" })).toHaveProperty("disabled", true);
    finish({ state: "linked", reason: null });
    expect(await screen.findByText("Notebook da Ana")).toBeTruthy();
    expect(actions.requestFolder).toHaveBeenCalledWith(CART_PROJECT.id);
    expect(screen.getByRole("button", { name: "Trocar pasta" })).toHaveProperty("disabled", false);
  });

  it("shows the request in progress as soon as the folder choice is clicked", async () => {
    let answer: (start: { status: "rejected"; reason: string }) => void = () => {};
    renderSettings({ kind: "none" }, actionsOf({ requestFolder: vi.fn(() => new Promise<{ status: "rejected"; reason: string }>((resolve) => { answer = resolve; })) }));
    await userEvent.click(screen.getByRole("button", { name: "Escolher pasta" }));
    expect(screen.getByRole("status").textContent).toContain("Enviando o pedido");
    expect(screen.getByRole("button", { name: "Escolher pasta" })).toHaveProperty("disabled", true);
    expect(screen.getByText("Pedido enviado").closest("li")?.getAttribute("aria-current")).toBe("step");
    answer({ status: "rejected", reason: "connector_unavailable" });
    expect((await screen.findByRole("alert")).textContent).toContain("Nenhum conector local pareado respondeu");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("button", { name: "Escolher pasta" })).toHaveProperty("disabled", false);
  });

  it("explains that the connector is not running instead of waiting for it", async () => {
    const actions = renderSettings({ kind: "none" }, actionsOf({ requestFolder: vi.fn(async () => ({ status: "rejected", reason: "connector_unavailable" }) as const) }));
    await userEvent.click(screen.getByRole("button", { name: "Escolher pasta" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Nenhum conector local pareado respondeu");
    expect(actions.folderRequest).not.toHaveBeenCalled();
  });

  it("keeps the current link and explains why when the chosen folder is refused", async () => {
    const actions = renderSettings({ kind: "ready", link: LINK }, actionsOf({ folderRequest: vi.fn(async () => ({ state: "failed", reason: "repository_mismatch" }) as const) }));
    await userEvent.click(screen.getByRole("button", { name: "Trocar pasta" }));
    expect((await screen.findByRole("alert")).textContent).toContain("aponta para outro repositório");
    expect(screen.getByText("Notebook da Ana")).toBeTruthy();
    expect(actions.mine).not.toHaveBeenCalled();
  });

  it("offers no folder choice where the local connector is unavailable", () => {
    renderSettings({ kind: "unavailable" });
    expect(screen.queryByRole("button", { name: "Escolher pasta" })).toBeNull();
  });
});
