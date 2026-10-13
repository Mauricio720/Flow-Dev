const CODEX_PROVIDER_KIND = "codex";
const ACP_OPTIONS_BLOCK = /^acp_options:\n(?:[ \t]+.*\n)+/m;

/** The bundled agents ask for Codex's full-access mode; any other provider rejects that ACP option and the session never starts. */
export function agentDefinitionFor(definition: string, providerKinds: string[]) {
  if (providerKinds.every((kind) => kind === CODEX_PROVIDER_KIND)) return definition;
  return definition.replace(ACP_OPTIONS_BLOCK, "");
}
