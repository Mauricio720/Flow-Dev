export const VIEW_MODE_LABELS = { overview: "Visão geral", product: "PRD", technical: "Tech Spec", original: "Documento original" } as const;
export type ViewMode = keyof typeof VIEW_MODE_LABELS;

export const PRODUCT_SECTIONS = {
  summary: "Resumo",
  journeys: "Jornadas",
  requirements: "Requisitos",
  personas: "Personas",
  decisions: "Decisões",
  metrics: "Métricas",
  risks: "Riscos",
} as const;

export const TECHNICAL_SECTIONS = {
  architecture: "Arquitetura",
  components: "Componentes",
  contracts: "Contratos",
  dataFlow: "Fluxo de dados",
  decisions: "Decisões técnicas",
  risks: "Riscos",
  impact: "Impacto",
  tests: "Testes",
} as const;

export const NAV_LABELS = { product: "Seções do PRD", technical: "Seções da Tech Spec", modes: "Visões do pacote" } as const;
export const NOT_SPECIFIED = "Não especificado neste documento.";
export const ORIGINAL_LINK = "Documento original";
export const SUBTITLES = {
  goals: "Objetivos",
  limits: "Limites e fora do escopo",
  rules: "Regras de negócio",
  open: "Ainda a decidir",
  alternatives: "Alternativas avaliadas",
  invariants: "Garantias e invariantes",
  boundaries: "Fronteiras e responsabilidades",
  acceptance: "Critérios de aceite",
  edges: "Casos de borda",
  tests: "Testes vinculados",
  uncovered: "Requisitos sem teste vinculado na matriz",
  steps: "Passos",
  scenarios: "Situações",
} as const;

export const JOURNEY_NOTE = "Os passos não estão numerados no documento; o texto aparece como foi escrito.";
export const DIAGRAM_NOTE = "Diagrama reconstruído só com os nós e as conexões declarados no documento.";
export const NO_DIAGRAM = "Nenhum diagrama declarado no documento.";
export const NO_TESTS_LINKED = "Sem vínculo conhecido na matriz de cobertura.";
export const TEST_STATUS_NOTE = "A matriz é o contrato previsto. Nenhuma execução destes testes foi registrada nesta etapa.";
export const CONTRACT_PART_LABELS = { all: "Contrato completo", text: "Descrição", table: "Campos e erros", example: "Exemplos" } as const;
export const TEST_KIND_LABELS = { unit: "Unitário", integration: "Integração", e2e: "Ponta a ponta", other: "Outro" } as const;
export const COVERAGE_HEADERS = { origin: "Origem", behavior: "Comportamento", tests: "Testes", checks: "Outras verificações" } as const;
export const WARNINGS_TITLE = "Avisos da leitura estruturada";
export const CHANGES_TITLE = "Mudanças desde a versão anterior";
export const CHANGE_KIND_LABELS = { requirement: "Requisito", decision: "Decisão", contract: "Contrato" } as const;
export const CHANGE_TYPE_LABELS = { added: "novo", removed: "removido", changed: "alterado" } as const;
export const NO_CHANGES = "Nenhuma mudança em requisitos, decisões ou contratos.";

export function connectionsLabel(targets: string[]) {
  return `segue para ${targets.join(", ")}`;
}

export function changesSince(version: number) {
  return `${CHANGES_TITLE} (v${version})`;
}
