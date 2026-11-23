export const ARTIFACTS_HEADING = "Artefatos";
export const ARTIFACTS_LIST_LABEL = "Artefatos";
export const NO_ARTIFACTS_NOTE = "Nenhum artefato guardado ainda.";
export const VERSION_PICKER_LABEL = "Versão";
export const ARTIFACT_LOAD_FAILED = "Não foi possível carregar o artefato agora. Tente de novo.";
export const ARTIFACT_LOADING = "Carregando o artefato…";
export const ARTIFACT_CONTENT_LABEL = "Conteúdo do artefato";

export function artifactItemLabel(input: { path: string; skill: string; versions: number }) {
  return `${input.path} · ${input.skill} · versão ${input.versions}`;
}

export function versionOptionLabel(input: { version: number; skill: string }) {
  return `Versão ${input.version} · ${input.skill}`;
}
