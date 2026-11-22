import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CART_PROJECT } from "@/test/tasks";
import { queueItemOf, queuePageOf } from "@/test/work";
import type { WorkListLoad } from "../contract";
import { AssignedWork } from "./AssignedWork";

const EMPTY_ACTIVE = { items: [], nextCursor: null };

function loadOf(patch: Partial<WorkListLoad> = {}): WorkListLoad {
  return { queue: { kind: "ready", page: queuePageOf([queueItemOf()]) }, active: { kind: "ready", page: EMPTY_ACTIVE }, ...patch };
}

describe("AssignedWork queue without a board", () => {
  it("points to the project settings when no GitHub board is linked", () => {
    const failure = { code: "PRECONDITION_FAILED", reason: "board_missing" };
    render(<AssignedWork project={CART_PROJECT} initial={loadOf({ queue: { kind: "failed", failure } })} />);
    expect(screen.getByRole("alert").textContent).toContain("Configurações");
    expect(screen.getByRole("link", { name: "Ir para Configurações" }).getAttribute("href")).toBe(`/projects/${CART_PROJECT.id}/settings`);
  });
});
