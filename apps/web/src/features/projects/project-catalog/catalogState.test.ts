import { describe, expect, it } from "vitest";
import { projectPath } from "@/lib/navigation/projectRoutes";
import { P1, P2, pageOf } from "@/test/projects";
import { catalogReducer, initialCatalogState, mergeProjectPages } from "./catalogState";

describe("catalog pages", () => {
  it("UT-002 keeps one option for a project repeated across pages, with one destination", () => {
    const merged = mergeProjectPages([P1], [{ ...P1 }, P2, { ...P2 }]);
    expect(merged.map((project) => project.id)).toEqual(["p1", "p2"]);
    expect(merged.filter((project) => project.id === "p1").map((project) => projectPath(project.id))).toEqual(["/projects/p1"]);
  });

  it("appends a cursor page and replaces the list for a new search", () => {
    const first = initialCatalogState({ kind: "ready", page: pageOf([P1], "next") });
    const appended = catalogReducer(first, { type: "loaded", request: { search: "", cursor: "next" }, page: pageOf([P1, P2]) });
    expect(appended.items.map((project) => project.id)).toEqual(["p1", "p2"]);
    const searched = catalogReducer(appended, { type: "loaded", request: { search: "docs" }, page: pageOf([P2]) });
    expect(searched).toMatchObject({ appliedSearch: "docs", nextCursor: null, status: "ready" });
    expect(searched.items.map((project) => project.id)).toEqual(["p2"]);
  });

  it("starts as a recoverable failure, never as an empty catalog, when the first page fails", () => {
    expect(initialCatalogState({ kind: "failed" })).toMatchObject({ status: "failed", pending: { search: "" } });
  });
});
