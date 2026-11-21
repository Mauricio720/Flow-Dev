import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { P1, projectConflict } from "@/test/projects";
import { ProjectSettings } from "./index";

const update = vi.mocked(trpc.projects.updateDetails.mutate);
const byId = vi.mocked(trpc.projects.byId.query);
const VERSION_3 = { ...P1, detailsVersion: 3 };
const VERSION_4 = { ...P1, name: "Renomeado por outra pessoa", description: "Descrita por outra pessoa", detailsVersion: 4 };

function editor() {
  render(<ProjectSettings project={VERSION_3} canEdit />);
  return { name: screen.getByLabelText<HTMLInputElement>("Nome do projeto"), description: screen.getByLabelText<HTMLTextAreaElement>("Descrição (opcional)"), save: screen.getByRole<HTMLButtonElement>("button", { name: "Salvar detalhes" }) };
}

async function rename(field: HTMLElement, value: string) {
  await userEvent.clear(field);
  await userEvent.type(field, value);
}

describe("project settings", () => {
  it("UT-041 sends only the identifier, details and expected version, with the repository read-only", async () => {
    update.mockResolvedValue({ ...VERSION_3, name: "Beta", detailsVersion: 4 });
    const form = editor();
    await rename(form.name, "Beta");
    await userEvent.click(form.save);
    expect(await screen.findByText("Detalhes salvos.")).toBeTruthy();
    expect(update).toHaveBeenCalledWith({ projectId: "p1", name: "Beta", description: "Loja principal", expectedVersion: 3 });
    expect(screen.getAllByRole("textbox")).toHaveLength(3);
    expect(screen.getByText("acme/private")).toBeTruthy();
  });

  it("UT-042 shows the current details after a version conflict and requires a review before sending again", async () => {
    update.mockRejectedValueOnce(projectConflict("version")).mockResolvedValueOnce({ ...VERSION_4, name: "Beta", detailsVersion: 5 });
    byId.mockResolvedValue(VERSION_4);
    const form = editor();
    await rename(form.name, "Beta");
    await userEvent.click(form.save);
    expect(await screen.findByText("Renomeado por outra pessoa")).toBeTruthy();
    expect(screen.getByText("Descrita por outra pessoa")).toBeTruthy();
    expect(form.save.disabled).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Manter minhas alterações" }));
    await userEvent.click(form.save);
    await waitFor(() => expect(update).toHaveBeenLastCalledWith({ projectId: "p1", name: "Beta", description: "Loja principal", expectedVersion: 4 }));
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("UT-010 sends the trimmed name and keeps the saved version when another project already uses it", async () => {
    update.mockRejectedValue(projectConflict("name"));
    const form = editor();
    await rename(form.name, " Projeto ");
    await userEvent.click(form.save);
    await waitFor(() => expect(form.name.getAttribute("aria-invalid")).toBe("true"));
    expect(screen.getByRole("alert").textContent).toContain("Já existe um projeto com esse nome");
    await userEvent.click(form.save);
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    expect(update).toHaveBeenLastCalledWith({ projectId: "p1", name: "Projeto", description: "Loja principal", expectedVersion: 3 });
  });

  it("UT-011 sends a cleared description as null and keeps repository 202 in view", async () => {
    update.mockResolvedValue({ ...VERSION_3, description: null, detailsVersion: 4 });
    const form = editor();
    await userEvent.clear(form.description);
    await userEvent.click(form.save);
    await waitFor(() => expect(update).toHaveBeenCalledWith({ projectId: "p1", name: "Projeto Alfa", description: null, expectedVersion: 3 }));
    expect(VERSION_3.repository.githubId).toBe("202");
    expect(screen.getByText("acme/private")).toBeTruthy();
  });

  it("shows a member the details without any edit control", () => {
    render(<ProjectSettings project={VERSION_3} canEdit={false} />);
    expect(screen.getByText("Projeto Alfa")).toBeTruthy();
    expect(screen.getByText("acme/private")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
