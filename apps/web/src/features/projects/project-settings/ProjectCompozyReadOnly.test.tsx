import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { CHECKOUT_PATH, READY_BINDING, compozyFailure, overview } from "@/test/compozy";
import { P1 } from "@/test/projects";
import { CompozyBindingReadOnly } from "./compozy/CompozyBindingReadOnly";
import { ProjectSettings } from "./index";

const get = vi.mocked(trpc.projectCompozy.get.query);
const UNREACHABLE = { reachable: false, version: null };

describe("compozy execution settings for members", () => {
  it("UT-030 shows the binding state without the path field or any button", async () => {
    get.mockResolvedValue(overview(READY_BINDING));
    render(<CompozyBindingReadOnly projectId="p1" repository="acme/private" />);
    expect(await screen.findByText("Pronto")).toBeTruthy();
    expect(screen.getByText(CHECKOUT_PATH)).toBeTruthy();
    expect(screen.getByText("main")).toBeTruthy();
    expect(screen.getByText("ws_9c1e0f2a7b3d4e5f")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(get).toHaveBeenCalledWith({ projectId: "p1" });
  });

  it("UT-030 renders the read-only section in project settings when the viewer cannot edit", async () => {
    get.mockResolvedValue(overview(READY_BINDING));
    render(<ProjectSettings project={P1} canEdit={false} />);
    expect(await screen.findByRole("heading", { name: "Execução no CompozyOS" })).toBeTruthy();
    expect(await screen.findByText("CompozyOS 0.7.3 acessível")).toBeTruthy();
    expect(screen.queryByLabelText("Pasta local do repositório")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("tells a member the execution was not configured yet", async () => {
    get.mockResolvedValue(overview(null));
    render(<CompozyBindingReadOnly projectId="p1" repository="acme/private" />);
    expect(await screen.findByText("A execução no CompozyOS ainda não foi configurada para este projeto.")).toBeTruthy();
  });

  it("keeps the saved state when CompozyOS is down", async () => {
    get.mockResolvedValue(overview(READY_BINDING, UNREACHABLE));
    render(<CompozyBindingReadOnly projectId="p1" repository="acme/private" />);
    expect(await screen.findByText("CompozyOS indisponível nesta máquina")).toBeTruthy();
    expect(screen.getByText("Pronto")).toBeTruthy();
  });

  it("explains a server configuration failure while loading", async () => {
    get.mockRejectedValue(compozyFailure("INTERNAL_SERVER_ERROR", "compozy_unconfigured"));
    render(<CompozyBindingReadOnly projectId="p1" repository="acme/private" />);
    expect((await screen.findByRole("alert")).textContent).toBe("Configuração do CompozyOS inválida no servidor");
  });
});
