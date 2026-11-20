import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { CHECKOUT_PATH, READY_BINDING, compozyFailure, invalidBinding, overview } from "@/test/compozy";
import { P1, deferred } from "@/test/projects";
import type { CompozyBinding } from "./compozy/compozyContract";
import { ProjectSettings } from "./index";

const get = vi.mocked(trpc.projectCompozy.get.query);
const save = vi.mocked(trpc.projectCompozy.save.mutate);
const check = vi.mocked(trpc.projectCompozy.check.mutate);

async function adminSection(binding: CompozyBinding | null = null) {
  get.mockResolvedValue(overview(binding));
  render(<ProjectSettings project={P1} canEdit />);
  const path = await screen.findByLabelText<HTMLInputElement>("Pasta local do repositório");
  return { path, save: screen.getByRole<HTMLButtonElement>("button", { name: "Verificar e salvar" }) };
}

async function submitPath(form: Awaited<ReturnType<typeof adminSection>>, value: string) {
  await userEvent.clear(form.path);
  await userEvent.type(form.path, value);
  await userEvent.click(form.save);
}

describe("compozy execution settings for administrators", () => {
  it("asks for an absolute path before sending anything", async () => {
    const form = await adminSection();
    expect(screen.getByText(/clone de acme\/private nesta máquina/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Verificar novamente" })).toBeNull();
    await userEvent.click(form.save);
    expect(screen.getByRole("alert").textContent).toBe("Informe o caminho absoluto da pasta");
    expect(save).not.toHaveBeenCalled();
  });

  it("locks the field while verifying and then shows the ready binding", async () => {
    const pending = deferred<CompozyBinding>();
    save.mockReturnValue(pending.promise);
    const form = await adminSection();
    await submitPath(form, ` ${CHECKOUT_PATH} `);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Verificando…" }).disabled).toBe(true);
    expect(form.path.disabled).toBe(true);
    pending.resolve(READY_BINDING);
    expect(await screen.findByText("Pronto")).toBeTruthy();
    expect(save).toHaveBeenCalledWith({ projectId: "p1", checkoutPath: CHECKOUT_PATH, expectedRevision: undefined });
    expect(screen.getByText("main")).toBeTruthy();
    expect(screen.getByText("ws_9c1e0f2a7b3d4e5f")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Verificar novamente" })).toBeTruthy();
  });

  it("shows an invalid binding with the remote mismatch reason", async () => {
    save.mockResolvedValue(invalidBinding("checkout_remote_mismatch", 1));
    await submitPath(await adminSection(), "/tmp/outro");
    expect(await screen.findByText("Inválido")).toBeTruthy();
    expect(screen.getByText("O repositório desta pasta não é acme/private")).toBeTruthy();
  });

  it("keeps the saved binding when CompozyOS is down while saving", async () => {
    save.mockRejectedValue(compozyFailure("SERVICE_UNAVAILABLE", "compozy_unavailable"));
    await submitPath(await adminSection(READY_BINDING), "/tmp/novo");
    expect((await screen.findByRole("alert")).textContent).toBe("CompozyOS indisponível nesta máquina");
    expect(screen.getAllByText("CompozyOS indisponível nesta máquina")).toHaveLength(2);
    expect(screen.getByText("Pronto")).toBeTruthy();
    expect(save).toHaveBeenCalledWith({ projectId: "p1", checkoutPath: "/tmp/novo", expectedRevision: 3 });
  });

  it("rechecks the saved folder and shows why it became invalid", async () => {
    check.mockResolvedValue(invalidBinding("checkout_not_found"));
    await adminSection(READY_BINDING);
    await userEvent.click(screen.getByRole("button", { name: "Verificar novamente" }));
    expect(await screen.findByText("Pasta não encontrada ou sem acesso")).toBeTruthy();
    expect(check).toHaveBeenCalledWith({ projectId: "p1", expectedRevision: 3 });
  });

  it("asks to reload after a revision conflict and sends the new revision next", async () => {
    save.mockRejectedValueOnce(compozyFailure("CONFLICT", "binding_conflict")).mockResolvedValueOnce({ ...READY_BINDING, revision: 5 });
    const form = await adminSection(READY_BINDING);
    await submitPath(form, "/tmp/novo");
    expect((await screen.findByRole("alert")).textContent).toBe("O vínculo mudou; recarregue");
    get.mockResolvedValue(overview({ ...READY_BINDING, revision: 4 }));
    await userEvent.click(screen.getByRole("button", { name: "Recarregar vínculo" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    await userEvent.click(form.save);
    await waitFor(() => expect(save).toHaveBeenLastCalledWith({ projectId: "p1", checkoutPath: "/tmp/novo", expectedRevision: 4 }));
  });
});
