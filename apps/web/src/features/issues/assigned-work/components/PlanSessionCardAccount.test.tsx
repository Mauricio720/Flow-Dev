import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { planItemOf, planOf } from "@/test/plan";
import { P, T, approvedDetail } from "@/test/tasks";
import { setOf, taskOf } from "@/test/taskSet";
import { AGENTS } from "@/test/terminal";
import { CODEX_B, chosen, defaultChoice, workAccountsOf } from "@/test/workAccounts";
import { ExecutionPlanEditor } from "./ExecutionPlanEditor";
import { WorkAccountsScope } from "./WorkAccountsScope";

const getPlan = vi.mocked(trpc.tasks.plan.get.query);
const getAccounts = vi.mocked(trpc.tasks.workAccounts.get.query);
const CODEX_CHOICE = { agent: "codex", model: "gpt-6.1-sol", effort: "high" } as const;
const CODEX_AGENT = { agent: "codex" as const, available: true, reason: null, models: ["gpt-6.1-sol"], efforts: ["high"] };
const SCOPE = { projectId: P, taskId: T };
const ITEM = "00000000-0000-4000-8000-0000000000e1";
const SET = setOf([taskOf("01", { status: "in_progress" }), taskOf("02", { dependsOn: ["task_01"] }), taskOf("03", { status: "completed" })]);

describe("V-11e account shown in the plan session card", () => {
  it("shows the current Codex account of the work on a Codex session and the default login on a Claude one", async () => {
    getAccounts.mockResolvedValue(workAccountsOf({ choices: [defaultChoice("claude"), chosen(CODEX_B)], options: { claude: [], codex: [CODEX_B] }, version: 1 }));
    getPlan.mockResolvedValue(planOf([planItemOf(ITEM, ["task_01"], { choice: CODEX_CHOICE }), planItemOf("00000000-0000-4000-8000-0000000000e2", ["task_03"])], { agents: [AGENTS[0]!, CODEX_AGENT] }));
    render(<WorkAccountsScope taskId={T} operate><ExecutionPlanEditor scope={SCOPE} detail={approvedDetail()} set={SET} reader={false} /></WorkAccountsScope>);
    const cards = await screen.findAllByRole("heading", { name: /^Sessão \d/ });
    const first = cards[0]!.closest("li")!;
    const second = cards[1]!.closest("li")!;
    expect(await within(first).findByText("Conta: Codex B")).toBeDefined();
    expect(within(first).getByRole("button", { name: "Trocar conta" })).toBeDefined();
    expect(within(second).getByText("Conta: Login padrão desta máquina")).toBeDefined();
  });

  it("does not show the account line to a person who only reads the plan", async () => {
    getPlan.mockResolvedValue(planOf([planItemOf(ITEM, ["task_01"], { state: "ready" })], { canEdit: false }));
    render(<ExecutionPlanEditor scope={SCOPE} detail={approvedDetail()} set={SET} reader={false} />);
    await screen.findAllByRole("heading", { name: /^Sessão \d/ });
    expect(screen.queryByText(/^Conta:/)).toBeNull();
  });
});
