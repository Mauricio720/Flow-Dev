export const GENERIC_TASK_LABEL = "generica";
export const TASK_LABELS = ["frontend", "backend", "infra", "docs", GENERIC_TASK_LABEL] as const;
export type TaskLabel = (typeof TASK_LABELS)[number];

export const TASK_LABEL_DESCRIPTION: Record<TaskLabel, string> = {
  frontend: "Interface, telas, componentes e estilos",
  backend: "API, regras de negócio, banco de dados e workers",
  infra: "Deploy, pipelines, containers e ambientes",
  docs: "Documentação e guias",
  generica: "Sem área técnica identificada",
};

export const TASK_LABEL_COLOR: Record<TaskLabel, string> = {
  frontend: "7c4dff",
  backend: "0e8a8a",
  infra: "d6336c",
  docs: "7a8b0f",
  generica: "8b949e",
};
