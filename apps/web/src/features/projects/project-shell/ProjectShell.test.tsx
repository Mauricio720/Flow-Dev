import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import type { ConnectionState, Project } from "@/lib/projects/contract";
import { ACME_PRIVATE, OCTO_DOCS, deferred, pendingForever, projectFixture, stateOf, trpcFailure } from "@/test/projects";
import { ProjectShell } from "./index";

const states = vi.mocked(trpc.projects.connectionStates.query);
const DRAFT_LABEL = "Rascunho do workspace";

function shellFor(project: Project) {
  return (
    <ProjectShell project={project} section="issues" isAdmin>
      <label>{DRAFT_LABEL}<input /></label>
    </ProjectShell>
  );
}

function activeProject() {
  return screen.getByRole("group", { name: "Projeto ativo" }).textContent;
}

describe("project shell navigation by role", () => {
  it("shows an administrator the work, authoring and local project menus", () => {
    states.mockImplementation(() => pendingForever());
    render(shellFor(projectFixture("p1", "p1", OCTO_DOCS)));
    const menus = within(screen.getByRole("navigation", { name: "Menus do projeto" }));
    expect(menus.getByRole("link", { name: "Trabalho atribuído" }).getAttribute("href")).toBe("/projects/p1/work");
    expect(menus.getByRole("link", { name: "Issues" }).getAttribute("href")).toBe("/projects/p1/issues");
    expect(menus.getByRole("link", { name: "Projeto local" }).getAttribute("href")).toBe("/projects/p1/settings/local-project");
  });

  it("hides the authoring menu from a non administrator and marks the work menu current", () => {
    states.mockImplementation(() => pendingForever());
    render(<ProjectShell project={projectFixture("p1", "p1", OCTO_DOCS)} section="work" isAdmin={false}><p>conteúdo</p></ProjectShell>);
    const menus = within(screen.getByRole("navigation", { name: "Menus do projeto" }));
    expect(menus.queryByRole("link", { name: "Issues" })).toBeNull();
    expect(menus.getByRole("link", { name: "Trabalho atribuído" }).getAttribute("aria-current")).toBe("page");
  });
});

describe("project shell", () => {
  it("UT-043 shows p2 and acme/private in the header and drops the previous workspace", async () => {
    states.mockImplementation(() => pendingForever());
    const view = render(shellFor(projectFixture("p1", "p1", OCTO_DOCS)));
    await userEvent.type(screen.getByLabelText(DRAFT_LABEL), "conversa de p1");
    view.rerender(shellFor(projectFixture("p2", "p2", ACME_PRIVATE)));
    expect(activeProject()).toBe("p2acme/private");
    expect(screen.queryByText("octo/docs")).toBeNull();
    expect(screen.getByLabelText<HTMLInputElement>(DRAFT_LABEL).value).toBe("");
  });

  it("UT-004 keeps the workspace in place when the active project is selected again", async () => {
    states.mockImplementation(() => pendingForever());
    const view = render(shellFor(projectFixture("p1", "p1", ACME_PRIVATE)));
    await userEvent.type(screen.getByLabelText(DRAFT_LABEL), "conversa de p1");
    view.rerender(shellFor(projectFixture("p1", "p1", ACME_PRIVATE)));
    expect(screen.getByLabelText<HTMLInputElement>(DRAFT_LABEL).value).toBe("conversa de p1");
    expect(states).toHaveBeenCalledTimes(1);
  });

  it("UT-005 keeps p2 current when the answer for p1 arrives last", async () => {
    const answers = { p1: deferred<ConnectionState[]>(), p2: deferred<ConnectionState[]>() };
    states.mockImplementation(({ projectIds }) => answers[projectIds[0] as "p1" | "p2"].promise);
    const view = render(shellFor(projectFixture("p1", "p1", OCTO_DOCS)));
    view.rerender(shellFor(projectFixture("p2", "p2", ACME_PRIVATE)));
    answers.p2.resolve([stateOf("p2", "available")]);
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Repositório disponível"));
    await act(async () => answers.p1.reject(trpcFailure("NOT_FOUND")));
    expect(activeProject()).toBe("p2acme/private");
    expect(screen.getByRole("status").textContent).toBe("Repositório disponível");
    expect(screen.getByRole("navigation", { name: "Menus do projeto" })).toBeTruthy();
  });

  it("UT-044 hides the menus and offers the catalog when p1 answers NOT_FOUND", async () => {
    states.mockRejectedValue(trpcFailure("NOT_FOUND"));
    render(shellFor(projectFixture("p1", "p1", ACME_PRIVATE)));
    expect((await screen.findByRole("link", { name: "Voltar ao catálogo" })).getAttribute("href")).toBe("/projects");
    expect(screen.queryByRole("navigation", { name: "Menus do projeto" })).toBeNull();
    expect(screen.queryByLabelText(DRAFT_LABEL)).toBeNull();
    expect(screen.queryByText("acme/private")).toBeNull();
  });

  it("keeps the saved identity and blocks nothing else while GitHub is temporarily unavailable", async () => {
    states.mockResolvedValue([stateOf("p1", "temporarily_unavailable")]);
    render(shellFor(projectFixture("p1", "p1", ACME_PRIVATE)));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("GitHub temporariamente indisponível"));
    expect(activeProject()).toBe("p1acme/private");
  });
});
