import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { CART_PROJECT, P, T, decisionOf, planningOf, publishedDetail, summaryOf } from "@/test/tasks";
import { snapshotOf, viewOf } from "@/test/work";
import type { TaskDetail, WorkDetailLoad } from "../contract";
import { WorkDetail } from "./WorkDetail";

const byTask = vi.mocked(trpc.assignedIssues.byTask.query);
const byId = vi.mocked(trpc.tasks.byId.query);
const NONE = { kind: "none" } as const;
const SELECTION = { stage: null, packageId: null, documentId: null };
const SOURCE = { snapshotId: "s1", revision: 1, origin: "external", contentHash: "abcdef0123456789", issueNumber: 41, issueUrl: "https://github.com/acme/cart/issues/41" };
const AWAITING = (): TaskDetail => ({ ...publishedDetail(), publication: null, currentRevision: null, task: summaryOf({ status: "published", authorUserId: null as never, authorName: null }), planning: planningOf({ status: "awaiting", source: SOURCE, eligibility: { canStart: true, reason: null } } as never) });

function loadOf(view = {}, detail = AWAITING()): WorkDetailLoad {
  return { taskId: T, work: { kind: "ready", snapshot: snapshotOf(view, detail) }, spec: NONE, specSelection: SELECTION, flow: NONE };
}

function renderDetail(initial: WorkDetailLoad) {
  return render(<WorkDetail project={CART_PROJECT} initial={initial} />);
}

async function recheck() {
  await act(async () => void window.dispatchEvent(new Event("focus")));
}

describe("WorkDetail capabilities", () => {
  it("returns to the assigned work list without using the project menu", () => {
    renderDetail(loadOf());
    expect(screen.getByRole("link", { name: "Voltar para Trabalho atribuído" }).getAttribute("href")).toBe(`/projects/${P}/work`);
  });

  it("UT-155 shows operator controls for an eligible explicit planning action", () => {
    renderDetail(loadOf());
    expect(screen.getByText(/Você é a pessoa operadora/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Analisar próxima etapa" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("UT-047 shows an observer the not-started state without fabricated activity", () => {
    renderDetail(loadOf({ viewerCanOperate: false, reason: "operator_required" }));
    expect(screen.getByRole("heading", { name: "Trabalho ainda não iniciado" })).toBeTruthy();
    expect(screen.getByText(/Você acompanha em modo leitura/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText("Intenção refinada")).toBeNull();
    expect(screen.queryByText("Issue publicada")).toBeNull();
    expect(screen.getByText("Fonte verificada no GitHub")).toBeTruthy();
  });

  it("UT-050 keeps an observer read-only when a polled claim becomes claimed by someone else", async () => {
    const pending = { taskId: T, state: "pending" as const, operatorId: null, reason: null };
    byId.mockResolvedValue(AWAITING());
    byTask.mockResolvedValue(viewOf({ viewerCanOperate: false, reason: "operator_required" }));
    renderDetail(loadOf({ viewerCanOperate: false, claim: pending }));
    expect(screen.getByText("Reivindicação pendente")).toBeTruthy();
    await recheck();
    expect(await screen.findByText("Reivindicada")).toBeTruthy();
    expect(screen.getByText(/Operador: outra pessoa do projeto/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("does not show a pending claimant as the operator", () => {
    renderDetail(loadOf({ viewerCanOperate: false, claim: { taskId: T, state: "pending", operatorId: null, reason: null } }));
    expect(screen.queryByText(/Operador:/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Analisar próxima etapa" })).toBeNull();
  });

  it("blocks controls and explains a changed source", () => {
    renderDetail(loadOf({ sourceChanged: true }));
    expect(screen.getByRole("alert").textContent).toContain("O texto da Issue mudou no GitHub");
  });
});

describe("WorkDetail refresh", () => {
  it("UT-156 clears the private cached work after a refresh denies repository access", async () => {
    byId.mockResolvedValue(AWAITING());
    byTask.mockRejectedValue(Object.assign(new Error("x"), { data: { code: "PRECONDITION_FAILED", reason: "repository_authorization_needed" } }));
    renderDetail(loadOf());
    expect(screen.getByRole("heading", { name: /Corrigir total do carrinho/ })).toBeTruthy();
    await recheck();
    expect(await screen.findByRole("button", { name: "Autorizar repositórios no GitHub" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /Corrigir total do carrinho/ })).toBeNull();
    expect(screen.queryByText(/Hash/)).toBeNull();
  });

  it("UT-032 keeps the same task and stored stage when reopened repeatedly after reconnect", async () => {
    const reviewing = { ...AWAITING(), planning: planningOf({ status: "review", eligibility: { canStart: true, reason: null }, decision: decisionOf({ matchesCurrentSource: true } as never) } as never) };
    byId.mockResolvedValue(reviewing);
    byTask.mockResolvedValue(viewOf());
    renderDetail(loadOf({}, reviewing));
    await recheck();
    await recheck();
    expect(byTask).toHaveBeenCalledWith({ projectId: P, taskId: T });
    expect(screen.getByRole("heading", { name: "Planejamento" })).toBeTruthy();
    expect(screen.getByText("Em revisão")).toBeTruthy();
    expect(screen.getAllByText("Em revisão")).toHaveLength(1);
  });

  it("keeps the last confirmed content visible on a transient failure", async () => {
    byId.mockResolvedValue(AWAITING());
    byTask.mockRejectedValue(Object.assign(new Error("x"), { data: { code: "SERVICE_UNAVAILABLE", reason: "provider_unavailable" } }));
    renderDetail(loadOf());
    await recheck();
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Corrigir total do carrinho/ })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
  });
});
