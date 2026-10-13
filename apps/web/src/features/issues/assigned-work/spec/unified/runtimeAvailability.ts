import type { DraftRuntime, FlowConnection } from "./unifiedContract";

const CONNECTION_GONE = "A conexão escolhida não está mais disponível. Escolha outra conexão.";
const CONNECTION_NOTICES: Record<string, string> = {
  catalog_stale: "O Flow Dev não conseguiu confirmar agora quais modelos esta conexão oferece. A lista é consultada de novo sozinha; aguarde alguns instantes ou escolha outra conexão.",
  auth_required: "A conta desta conexão foi desconectada. Reconecte a conta ou escolha outra conexão.",
};
const CONNECTION_FALLBACK = "Esta conexão não está pronta para executar agora. Escolha outra conexão.";
const MODEL_GONE = "O modelo escolhido não aparece mais nesta conexão. Escolha outro modelo.";
const MODEL_BLOCKED = "O modelo escolhido não pode ser usado nesta conexão agora. Escolha outro modelo.";
const REASONING_UNSUPPORTED = "Esse nível de raciocínio não existe para o modelo escolhido. Escolha outro nível.";

export function usableModel(connections: FlowConnection[], runtime: Pick<DraftRuntime, "connectionId" | "modelId"> | null) {
  const connection = connections.find((item) => item.id === runtime?.connectionId && item.ready);
  return connection?.models.find((item) => item.modelId === runtime?.modelId && item.selectable) ?? null;
}

export function runtimeNotice(connections: FlowConnection[], runtime: DraftRuntime | null) {
  if (!runtime) return null;
  const connection = connections.find((item) => item.id === runtime.connectionId);
  if (!connection) return CONNECTION_GONE;
  if (!connection.ready) return CONNECTION_NOTICES[connection.reason ?? ""] ?? CONNECTION_FALLBACK;
  if (!runtime.modelId) return null;
  const model = connection.models.find((item) => item.modelId === runtime.modelId);
  if (!model) return MODEL_GONE;
  if (!model.selectable) return MODEL_BLOCKED;
  return model.reasoningChoices.includes(runtime.reasoningEffort) ? null : REASONING_UNSUPPORTED;
}
