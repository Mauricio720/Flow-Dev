import type { ExecutionPlanInput } from "./executionPlan";

const ROUTE_LABEL = "Execução direta";
const NONE = "- Nenhuma";

type BriefingInput = ExecutionPlanInput & { branch: string };

export function directExecutionBriefing(input: BriefingInput) {
  return [
    `# ${input.issue.title}`,
    `Issue: ${input.issue.url}`,
    `Rota aprovada no Flow Dev: ${ROUTE_LABEL}`,
    section("Resumo do planejamento", input.decision.summary),
    section("Motivos", bulletList(input.decision.reasons)),
    section("Pendências", bulletList(input.decision.uncertainties)),
    section("Issue e critérios de aceite", input.issue.bodyMarkdown),
    section("Entrega", deliverySteps(input)),
    section("Encerramento do run", closingSteps()),
  ].join("\n\n");
}

function deliverySteps(input: BriefingInput) {
  return [
    "0. Trabalhe somente na worktree da sessão dedicada a este run. Se `compozy__task_run_claim_next` devolver outra sessão, encerre o turno sem alterar arquivos.",
    `1. Trabalhe no branch \`${input.branch}\`, criado a partir de \`origin/${input.defaultBranch}\`. Se ele já existir no remoto (tentativa anterior), continue a partir dele.`,
    "2. Implemente os critérios de aceite da Issue com testes e rode as verificações do projeto.",
    `3. Faça push do branch e abra um pull request para \`${input.defaultBranch}\`. Nunca faça merge.`,
    "4. Se uma revisão anterior pediu ajustes, trate cada item pendente antes de concluir.",
  ].join("\n");
}

function closingSteps() {
  return [
    "- Conclua o run com `compozy__task_run_complete`, passando como `result` um texto (não um objeto) com o resumo do que foi feito e das verificações.",
    "- A última linha do `result` deve ser `PR: <url do pull request>`.",
    "- Se não for possível concluir, use `compozy__task_run_fail` com o motivo.",
  ].join("\n");
}

function section(title: string, body: string) {
  return `## ${title}\n\n${body.trim()}`;
}

function bulletList(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : NONE;
}
