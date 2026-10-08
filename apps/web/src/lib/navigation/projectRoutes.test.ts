import { describe, expect, it } from "vitest";
import { PROJECTS_PATH, projectLocalProjectPath, projectWorkPath, projectWorkTaskPath, repositoryConnectPath, safeReturnPath } from "./projectRoutes";

const TASK = "00000000-0000-4000-8000-000000000011";

describe("project routes", () => {
  it("builds the work and local project paths", () => {
    expect(projectWorkPath("p1")).toBe("/projects/p1/work");
    expect(projectWorkTaskPath("p1", TASK)).toBe(`/projects/p1/work/${TASK}`);
    expect(projectLocalProjectPath("p1")).toBe("/projects/p1/settings/local-project");
  });

  it("UT-159 rejects an external return target", () => {
    expect(safeReturnPath(`https://attacker.invalid/work/${TASK}`, PROJECTS_PATH)).toBe(PROJECTS_PATH);
    expect(safeReturnPath("//attacker.invalid/projects/p1/work", PROJECTS_PATH)).toBe(PROJECTS_PATH);
    expect(safeReturnPath("/projects/p1/work/../issues", PROJECTS_PATH)).toBe(PROJECTS_PATH);
    expect(safeReturnPath("/projects\\attacker", PROJECTS_PATH)).toBe(PROJECTS_PATH);
    expect(safeReturnPath(null, PROJECTS_PATH)).toBe(PROJECTS_PATH);
  });

  it("keeps an internal work return target", () => {
    expect(safeReturnPath(`/projects/p1/work/${TASK}`, PROJECTS_PATH)).toBe(`/projects/p1/work/${TASK}`);
    expect(safeReturnPath("/projects/p1/settings/local-project", PROJECTS_PATH)).toBe("/projects/p1/settings/local-project");
  });

  it("allows only a well-formed local machine confirmation return target", () => {
    expect(safeReturnPath("/settings/local-machine/pairing/Abc_123-", PROJECTS_PATH)).toBe("/settings/local-machine/pairing/Abc_123-");
    expect(safeReturnPath("/settings/local-machine/pairing/../projects", PROJECTS_PATH)).toBe(PROJECTS_PATH);
    expect(safeReturnPath("/settings/local-machine/pairing/short", PROJECTS_PATH)).toBe(PROJECTS_PATH);
  });

  it("never forwards an external return target to the repository authorization", () => {
    expect(repositoryConnectPath("https://attacker.invalid/work")).toBe("/api/github-repositories/connect?returnTo=%2Fprojects");
    expect(repositoryConnectPath(`/projects/p1/work/${TASK}`)).toBe(`/api/github-repositories/connect?returnTo=${encodeURIComponent(`/projects/p1/work/${TASK}`)}`);
  });
});
