export const ARTIFACTS_HEADING = "Artefatos";
export const ARTIFACTS_LIST_LABEL = "Artefatos";
export const NO_ARTIFACTS_NOTE = "Nenhum artefato guardado ainda.";
export const VERSION_PICKER_LABEL = "Versão";
export const ARTIFACT_LOAD_FAILED = "Não foi possível carregar o artefato agora. Tente de novo.";
export const ARTIFACT_LOADING = "Carregando o artefato…";
export const ARTIFACT_CONTENT_LABEL = "Conteúdo do artefato";
export const ARTIFACT_CLOSE_LABEL = "Fechar o artefato";
export const ARTIFACT_META_LABEL = "Metadados do arquivo";

const SKILL_LABELS = new Map([["plano-de-execucao", "Plano de execução"]]);

export function skillLabel(skill: string) {
  return SKILL_LABELS.get(skill) ?? skill;
}

export function artifactItemLabel(input: { path: string; skill: string; versions: number }) {
  return `${input.path} · ${skillLabel(input.skill)} · versão ${input.versions}`;
}

export function versionOptionLabel(input: { version: number; skill: string }) {
  return `Versão ${input.version} · ${skillLabel(input.skill)}`;
}
