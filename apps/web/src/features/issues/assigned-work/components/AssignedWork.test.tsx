import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { P, T } from "@/test/tasks";
import { activeItemOf, queueItemOf, queuePageOf } from "@/test/work";
import type { WorkListLoad } from "../contract";
import { AssignedWork } from "./AssignedWork";
import { CART_PROJECT } from "@/test/tasks";

const list = vi.mocked(trpc.assignedIssues.list.query);
const claim = vi.mocked(trpc.assignedIssues.claim.mutate);
const active = vi.mocked(trpc.assignedIssues.active.query);
const EMPTY_ACTIVE = { items: [], nextCursor: null };
const queueRegion = () => within(screen.getByRole("region", { name: "Atribuídas a você em Ready" }));

function loadOf(patch: Partial<WorkListLoad> = {}): WorkListLoad {
  return { queue: { kind: "ready", page: queuePageOf([queueItemOf()]) }, active: { kind: "ready", page: EMPTY_ACTIVE }, ...patch };
}

describe("AssignedWork queue", () => {
  it("lists assigned Ready issues without claiming anything on render", () => {
    render(<AssignedWork project={CART_PROJECT} initial={loadOf()} />);
    const queue = screen.getByRole("list", { name: "Issues em Ready" });
    expect(within(queue).getByText("Corrigir total do carrinho")).toBeTruthy();
    expect(claim).not.toHaveBeenCalled();
  });

  it("UT-020 shows one row when two pages repeat the same issue node", async () => {
    const second = queuePageOf([queueItemOf(), queueItemOf({ issueNodeId: "I_other", boardItemId: "PVTI_B", number: 42, title: "Outra" })]);
    list.mockResolvedValue(second);
    render(<AssignedWork project={CART_PROJECT} initial={loadOf({ queue: { kind: "ready", page: queuePageOf([queueItemOf()], { nextCursor: "c1" }) } })} />);
    await userEvent.click(screen.getByRole("button", { name: "Carregar mais" }));
    const rows = within(await screen.findByRole("list", { name: "Issues em Ready" })).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(screen.getAllByText("Corrigir total do carrinho")).toHaveLength(1);
    expect(list).toHaveBeenCalledWith({ projectId: P, cursor: "c1" });
  });

  it("claims only on the explicit action and shows the confirmed state", async () => {
    claim.mockResolvedValue({ taskId: T, state: "pending", operatorId: null, reason: null, replayed: false });
    render(<AssignedWork project={CART_PROJECT} initial={loadOf()} />);
    await userEvent.click(screen.getByRole("button", { name: /Reivindicar #41/ }));
    expect(claim).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ projectId: P, issueNodeId: "I_kwDOAAA", boardItemId: "PVTI_AAA", requestKey: expect.any(String) }));
    await screen.findByText("Reivindicação pendente");
    expect(queueRegion().getByRole("status").textContent).toContain("Reivindicação pendente");
    expect(screen.getByRole("link", { name: "Abrir o trabalho" }).getAttribute("href")).toBe(`/projects/${P}/work/${T}`);
  });

  it("explains a rejected claim with the safe reason", async () => {
    claim.mockRejectedValue(Object.assign(new Error("x"), { data: { code: "PRECONDITION_FAILED", reason: "issue_ineligible" } }));
    render(<AssignedWork project={CART_PROJECT} initial={loadOf()} />);
    await userEvent.click(screen.getByRole("button", { name: /Reivindicar #41/ }));
    expect((await screen.findByRole("alert")).textContent).toContain("não atende mais às condições");
  });

  it.each([
    ["empty", /Nenhuma Issue atribuída a você está em Ready/],
    ["scan_continuing", /Ainda procurando no quadro/],
    ["retry_later", /limitou as consultas/],
  ] as const)("keeps %s distinct from the other queue states", (availability, copy) => {
    const page = queuePageOf([], { availability, nextCursor: availability === "scan_continuing" ? "c1" : null, retryAfterSeconds: availability === "retry_later" ? 30 : null });
    render(<AssignedWork project={CART_PROJECT} initial={loadOf({ queue: { kind: "ready", page } })} />);
    expect(queueRegion().getByRole("status").textContent).toMatch(copy);
  });

  it("offers GitHub reconnection when authorization is missing", () => {
    const failure = { code: "PRECONDITION_FAILED", reason: "repository_authorization_needed" };
    render(<AssignedWork project={CART_PROJECT} initial={loadOf({ queue: { kind: "failed", failure } })} />);
    expect(screen.getByRole("button", { name: "Autorizar repositórios no GitHub" })).toBeTruthy();
  });
});

describe("AssignedWork active list", () => {
  it("UT-028 shows the Portuguese empty state when nothing is claimed", () => {
    render(<AssignedWork project={CART_PROJECT} initial={loadOf()} />);
    expect(screen.getByText("Você ainda não tem trabalho reivindicado neste projeto.")).toBeTruthy();
  });

  it("UT-078 shows each item with its own unchanged block reason", () => {
    const items = [activeItemOf({ blockReason: "machine_unavailable" }), activeItemOf({ taskId: "t2", title: "Segunda Issue", issueNumber: 42, blockReason: "source_changed" })];
    render(<AssignedWork project={CART_PROJECT} initial={loadOf({ active: { kind: "ready", page: { items, nextCursor: null } } })} />);
    const [first, second] = within(screen.getByRole("list", { name: "Trabalho em andamento" })).getAllByRole("listitem");
    expect(first.textContent).toContain("A máquina vinculada não respondeu");
    expect(first.textContent).not.toContain("O texto da Issue mudou");
    expect(second.textContent).toContain("O texto da Issue mudou no GitHub");
    expect(second.textContent).not.toContain("A máquina vinculada");
  });

  it("switches to the shared list through the explicit filter", async () => {
    active.mockResolvedValue({ items: [activeItemOf({ operatorName: "Bruno" })], nextCursor: null });
    render(<AssignedWork project={CART_PROJECT} initial={loadOf()} />);
    await userEvent.click(screen.getByRole("button", { name: "Do projeto" }));
    expect(await screen.findByText(/Operador: Bruno/)).toBeTruthy();
    expect(active).toHaveBeenCalledWith({ projectId: P, filter: "shared", cursor: undefined });
  });
});
