import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { P1, pageOf, pendingForever } from "@/test/projects";
import { ProjectCatalog } from "@/features/projects/project-catalog";

function renderCatalog(isAdmin: boolean) {
  vi.mocked(trpc.projects.connectionStates.query).mockImplementation(() => pendingForever());
  return render(<ProjectCatalog initial={{ kind: "ready", page: pageOf([P1]) }} viewer={{ isAdmin, lastProjectId: null }} notice={null} />);
}

describe("global software navigation", () => {
  it("IT-001 and IT-007 offer Software to administrators without entering a project", () => {
    renderCatalog(true);
    expect(screen.getByRole("link", { name: "Software" }).getAttribute("href")).toBe("/admin/software/compozy");
    expect(screen.getByRole("link", { name: "Acessos" })).toBeTruthy();
  });

  it("hides Software from members", () => {
    renderCatalog(false);
    expect(screen.queryByRole("link", { name: "Software" })).toBeNull();
  });
});
