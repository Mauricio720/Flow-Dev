import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { P1, trpcFailure } from "@/test/projects";
import { ProjectSettings } from "./index";

const updateBoard = vi.mocked(trpc.projects.updateBoard.mutate);
const BOARD_URL = "https://github.com/orgs/acme/projects/7";
const BOARD = { url: BOARD_URL, title: "Roadmap Acme" };
const LINKED = { ...P1, board: BOARD };

function boardForm(project = P1) {
  render(<ProjectSettings project={project} canEdit />);
  return { url: screen.getByLabelText<HTMLInputElement>("Link do GitHub Project"), save: screen.getByRole("button", { name: "Salvar quadro" }) };
}

describe("project board settings", () => {
  it("saves the trimmed board link and shows the linked board", async () => {
    updateBoard.mockResolvedValue(LINKED);
    const form = boardForm();
    await userEvent.type(form.url, ` ${BOARD_URL} `);
    await userEvent.click(form.save);
    expect(await screen.findByText("Quadro salvo.")).toBeTruthy();
    expect(updateBoard).toHaveBeenCalledWith({ projectId: "p1", boardUrl: BOARD_URL });
    expect(screen.getByRole("link", { name: "Roadmap Acme" }).getAttribute("href")).toBe(BOARD_URL);
  });

  it("asks for the link before sending anything", async () => {
    const form = boardForm();
    await userEvent.click(form.save);
    expect(screen.getByRole("alert").textContent).toContain("Informe o link");
    expect(updateBoard).not.toHaveBeenCalled();
  });

  it("explains a board without the Backlog status", async () => {
    updateBoard.mockRejectedValue(trpcFailure("UNPROCESSABLE_CONTENT"));
    const form = boardForm();
    await userEvent.type(form.url, BOARD_URL);
    await userEvent.click(form.save);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("não tem a opção Backlog"));
  });

  it("offers a new GitHub authorization when the board scope is missing", async () => {
    updateBoard.mockRejectedValue(trpcFailure("PRECONDITION_FAILED"));
    const form = boardForm();
    await userEvent.type(form.url, BOARD_URL);
    await userEvent.click(form.save);
    expect(await screen.findByRole("button", { name: "Autorizar quadros no GitHub" })).toBeTruthy();
  });

  it("unlinks the current board", async () => {
    updateBoard.mockResolvedValue(P1);
    boardForm(LINKED);
    await userEvent.click(screen.getByRole("button", { name: "Desvincular quadro" }));
    expect(await screen.findByText("Quadro desvinculado.")).toBeTruthy();
    expect(updateBoard).toHaveBeenCalledWith({ projectId: "p1", boardUrl: null });
  });

  it("shows a member the board without any edit control", () => {
    render(<ProjectSettings project={LINKED} canEdit={false} />);
    expect(screen.getByRole("link", { name: "Roadmap Acme" })).toBeTruthy();
    expect(screen.queryByLabelText("Link do GitHub Project")).toBeNull();
  });
});
