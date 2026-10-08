import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { P1, P2, deferred, pageOf, pendingForever, trpcFailure } from "@/test/projects";
import type { CatalogLoad, CatalogViewer } from "./catalogState";
import { ProjectCatalog } from "./index";

const MEMBER: CatalogViewer = { isAdmin: false, lastProjectId: null };
const list = vi.mocked(trpc.projects.list.query);
const states = vi.mocked(trpc.projects.connectionStates.query);
const select = vi.mocked(trpc.projects.select.mutate);

function renderCatalog(initial: CatalogLoad, viewer = MEMBER) {
  states.mockImplementation(() => pendingForever());
  return render(<ProjectCatalog initial={initial} viewer={viewer} notice={null} />);
}

describe("project selection from the catalog", () => {
  it("UT-004 selecting the already active project keeps it selected and opens it once", async () => {
    let lastProjectId = "p1";
    select.mockImplementation(async ({ projectId }) => {
      lastProjectId = projectId;
      return P1;
    });
    renderCatalog({ kind: "ready", page: pageOf([P1]) }, { isAdmin: false, lastProjectId });
    await userEvent.click(screen.getByRole("link", { name: "Projeto Alfa acme/private" }));
    await waitFor(() => expect(useRouter().push).toHaveBeenCalledTimes(1));
    expect(useRouter().push).toHaveBeenCalledWith("/projects/p1/work");
    expect(lastProjectId).toBe("p1");
  });

  it("UT-005 keeps the latest selection when the answers arrive in reverse order", async () => {
    const answers = { p1: deferred<typeof P1>(), p2: deferred<typeof P2>() };
    select.mockImplementation(({ projectId }) => answers[projectId as "p1" | "p2"].promise);
    renderCatalog({ kind: "ready", page: pageOf([P1, P2]) });
    await userEvent.click(screen.getByRole("link", { name: "Projeto Alfa acme/private" }));
    await userEvent.click(screen.getByRole("link", { name: "Projeto Docs octo/docs" }));
    answers.p2.resolve(P2);
    answers.p1.resolve(P1);
    await waitFor(() => expect(useRouter().push).toHaveBeenCalledWith("/projects/p2/work"));
    expect(useRouter().push).toHaveBeenCalledTimes(1);
  });

  it("refreshes the list when the chosen project is no longer assigned", async () => {
    select.mockRejectedValue(trpcFailure("NOT_FOUND"));
    list.mockResolvedValue(pageOf([P2]));
    renderCatalog({ kind: "ready", page: pageOf([P1, P2]) });
    await userEvent.click(screen.getByRole("link", { name: "Projeto Alfa acme/private" }));
    expect((await screen.findByRole("alert")).textContent).toContain("não está mais disponível");
    await waitFor(() => expect(screen.queryByRole("link", { name: "Projeto Alfa acme/private" })).toBeNull());
    expect(useRouter().push).not.toHaveBeenCalled();
  });
});
