export const EXECUTION_REVIEW_BRIEFING = [
  "Compare a diff deste run com a descrição da Task e seus critérios de aceite.",
  "Não edite arquivos.",
  "Submeta o veredito pela ferramenta `compozy__task_run_review_submit`: `approved` se os critérios forem atendidos ou `rejected` se houver trabalho faltante.",
  "Inclua um resumo curto em `reason`; se rejeitar, informe `missing_work` e `next_round_guidance`.",
  "Nunca encerre o turno sem submeter o veredito.",
].join(" ");
