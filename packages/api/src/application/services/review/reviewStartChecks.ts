import type { AgentChoice, SessionAgent } from "../../terminal/sessionAgentCatalog";
import { choiceProblem, modelUnavailableMessage } from "../../terminal/sessionAgentCatalog";
import type { TerminalOpenGuard } from "../terminal/terminalOpenGuard";
import type { SessionCatalogStatus } from "../terminal/sessionServiceStatus";
import type { TaskSet } from "../tasks-set/taskSetTypes";
import { TaskError } from "../tasks/taskErrors";

export type ReviewStartChecksDeps = { guard: Pick<TerminalOpenGuard, "assertTools">; agents: ReadonlySet<SessionAgent>; catalog: Pick<SessionCatalogStatus, "codexStatus"> };

export function requireReadableTaskSet(set: TaskSet | null): TaskSet {
  if (!set || set.problem !== null) throw new TaskError("task_set_unavailable");
  return set;
}

export function requireCompleteTasks(set: TaskSet, partial: boolean) {
  const incomplete = set.tasks.filter((task) => task.status !== "completed").length;
  if (!partial && incomplete > 0) throw new TaskError("review_tasks_incomplete", { count: String(incomplete), total: String(set.tasks.length) });
}

export function requireNoActiveCycle(cycle: unknown) {
  if (cycle) throw new TaskError("review_cycle_active");
}

export function requireNoOpenSessions(count: number, allowOpenSessions: boolean) {
  if (count > 0 && !allowOpenSessions) throw new TaskError("review_sessions_open", { count: String(count) });
}

export async function requireReviewChoices(input: ReviewStartChecksDeps & { choices: AgentChoice[] }) {
  for (const choice of input.choices) await input.guard.assertTools(choice);
  const codex = await input.catalog.codexStatus();
  for (const choice of input.choices) requireValidChoice(choice, input.agents, codex);
}

function requireValidChoice(choice: AgentChoice, agents: ReadonlySet<SessionAgent>, codex: Awaited<ReturnType<SessionCatalogStatus["codexStatus"]>>) {
  if (choice.agent === "codex" && !codex) throw new TaskError("agent_unavailable", { message: "O catálogo do Codex ainda não foi publicado." });
  const problem = choiceProblem(choice, agents, codex);
  if (!problem) return;
  const message = problem === "model_unavailable" ? modelUnavailableMessage(choice.model) : choice.agent === "codex" ? codex?.reason : undefined;
  throw new TaskError(problem, message ? { message } : undefined);
}
