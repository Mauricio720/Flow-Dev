import { resolve } from "node:path";
import type { ExecutionPlanInput } from "./executionPlan";

const TECH_SPEC_ROUTE = "tech_spec";
const TECH_SPEC_LABEL = "Tech Spec";
const PRD_LABEL = "PRD";

type SpecBriefingInput = Pick<ExecutionPlanInput, "decision" | "issue"> & { route: "tech_spec" | "prd"; specDir: string };
type DeliveryBriefingInput = { issueTitle: string; specBranch: string; deliveryBranch: string; defaultBranch: string; worktreePath: string; specDir: string };

export function specGenerationBriefing(input: SpecBriefingInput) {
  const route = input.route === TECH_SPEC_ROUTE ? TECH_SPEC_LABEL : PRD_LABEL;
  const scope = input.route === TECH_SPEC_ROUTE ? technicalScope() : productScope();
  return [`# ${input.issue.title}`, `Issue: ${input.issue.url}`, `Rota aprovada: ${route}`, section("Resumo do planejamento", input.decision.summary), section("Motivos", list(input.decision.reasons)), section("Pendências", list(input.decision.uncertainties)), section("Issue e critérios de aceite", input.issue.bodyMarkdown), section("Spec", `${scope}\n\nUse a skill \`cy-create-spec\`. Grave os arquivos em \`${input.specDir}/\` e faça commit na worktree atual. Não implemente código antes da aprovação humana da spec.`)].join("\n\n");
}

export function specDeliveryBriefing(input: DeliveryBriefingInput) {
  const specPath = resolve(input.worktreePath, input.specDir);
  return [`# Entregar spec: ${input.issueTitle}`, `Pasta da spec aprovada: \`${specPath}\``, `Branch base da spec: \`origin/${input.specBranch}\``, `Branch de entrega: \`${input.deliveryBranch}\``, `Branch de destino do PR: \`origin/${input.defaultBranch}\``, "Leia a spec aprovada e implemente seus critérios de aceite na branch de entrega criada a partir da branch base da spec. Rode as verificações do projeto, faça commit, envie o branch e abra um pull request para o branch de destino. Não faça merge."].join("\n\n");
}

function technicalScope() {
  return "Produza o desenho técnico completo na Part II e uma síntese da Part I, incluindo arquitetura, modelos de dados, contratos de API, riscos e invariantes.";
}

function productScope() {
  return "Produza a Part I completa do PRD. Inclua \`_user_stories.md\` e, quando houver interface, \`_uiux.md\` com jornadas e estados.";
}

function section(title: string, body: string) {
  return `## ${title}\n\n${body.trim()}`;
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- Nenhuma";
}
