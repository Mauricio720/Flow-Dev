import { describe, expect, it } from "vitest";
import { PLAN_EXECUTION_SKILL, isPlanTaskFile } from "./planCaptureRule";

const FOLDER = "docs/specs/login";

describe("isPlanTaskFile", () => {
  it("V-39f accepts a Markdown file inside the folder of the task set, including subfolders", () => {
    expect(isPlanTaskFile("docs/specs/login/task_01.md", FOLDER)).toBe(true);
    expect(isPlanTaskFile("docs/specs/login/reviews/review-001.md", FOLDER)).toBe(true);
    expect(isPlanTaskFile("docs/specs/login/./task_01.md", FOLDER)).toBe(true);
  });

  it("V-39f refuses a sibling folder that starts with the same name, and files outside the folder", () => {
    expect(isPlanTaskFile("docs/specs/login-old/task_01.md", FOLDER)).toBe(false);
    expect(isPlanTaskFile("docs/specs/outra/spec.md", FOLDER)).toBe(false);
    expect(isPlanTaskFile("README.md", FOLDER)).toBe(false);
    expect(isPlanTaskFile("docs/specs/login.md", FOLDER)).toBe(false);
  });

  it("V-39f refuses a file that is not Markdown", () => {
    expect(isPlanTaskFile("docs/specs/login/notas.txt", FOLDER)).toBe(false);
    expect(isPlanTaskFile("docs/specs/login/task_01.md.bak", FOLDER)).toBe(false);
  });

  it("V-39f refuses a parent segment and an absolute path", () => {
    expect(isPlanTaskFile("docs/specs/login/../x.md", FOLDER)).toBe(false);
    expect(isPlanTaskFile("docs/specs/login/../login/x.md", FOLDER)).toBe(false);
    expect(isPlanTaskFile("/abs/docs/specs/login/task_01.md", FOLDER)).toBe(false);
    expect(isPlanTaskFile("docs/specs/login/task_01.md", "../docs/specs/login")).toBe(false);
  });

  it("accepts any Markdown file when the set lives at the repository root, and ignores a trailing slash on the folder", () => {
    expect(isPlanTaskFile("task_01.md", "")).toBe(true);
    expect(isPlanTaskFile("docs/specs/login/task_01.md", "docs/specs/login/")).toBe(true);
  });

  it("names the skill of the plan sessions as stored", () => {
    expect(PLAN_EXECUTION_SKILL).toBe("plano-de-execucao");
  });
});
