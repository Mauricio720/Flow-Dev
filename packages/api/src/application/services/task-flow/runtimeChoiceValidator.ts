import type { ConnectionRecord, ConnectionStore } from "../../database/dao/softwareDao";
import type { CompozyControlGateway } from "../../software/compozyControlGateway";
import type { RuntimeChoice } from "./flowContracts";
import { TaskFlowError, type TaskFlowReason } from "./taskFlowErrors";

export type ValidatedChoice = { connection: ConnectionRecord; release: string };
type ValidationMode = { lock: boolean };

const GATEWAY_REASONS: Record<string, TaskFlowReason> = {
  auth_required: "auth_required",
  catalog_stale: "catalog_stale",
  model_unavailable: "model_unavailable",
  reasoning_effort_unsupported: "reasoning_effort_unsupported",
  runtime_incompatible: "runtime_incompatible",
  outcome_unknown: "outcome_unknown",
};

export class RuntimeChoiceValidator {
  constructor(private readonly connections: ConnectionStore, private readonly gateway: CompozyControlGateway) {}

  async validate(choice: RuntimeChoice, mode: ValidationMode): Promise<ValidatedChoice> {
    const connection = await (mode.lock ? this.connections.lock(choice.connectionId) : this.connections.find(choice.connectionId));
    if (!connection || connection.disabledAt) throw new TaskFlowError("connection_unavailable");
    if (connection.providerKind !== choice.providerId) throw new TaskFlowError("invalid_input");
    if (connection.authState !== "connected") throw new TaskFlowError("auth_required");
    if (connection.executionTarget === "machine") {
      const models = connection.modelCatalog ?? [];
      const model = models.find((candidate) => candidate.modelId === choice.modelId);
      const availableModels = models.filter((candidate) => candidate.selectable).map(({ modelId, reasoningChoices }) => ({ modelId, reasoningChoices }));
      if (!model || !model.selectable) throw new TaskFlowError(model?.unselectableReason === "catalog_stale" ? "catalog_stale" : "model_unavailable", undefined, { availableModels });
      if (!model.reasoningChoices.includes(choice.reasoningEffort)) throw new TaskFlowError("reasoning_effort_unsupported", undefined, { availableModels });
      return { connection, release: "machine-local" };
    }
    const result = await this.gateway.validateChoice(connection.runtimeProviderId, { modelId: choice.modelId, reasoningEffort: choice.reasoningEffort });
    if (result.ok) return { connection, release: result.release };
    throw new TaskFlowError(GATEWAY_REASONS[result.code] ?? "service_unavailable", undefined, await this.currentChoices(connection));
  }

  private async currentChoices(connection: ConnectionRecord) {
    const listed = await this.gateway.listModels(connection.runtimeProviderId);
    if (!listed.ok) return undefined;
    const availableModels = listed.value.filter((model) => model.selectable).map((model) => ({ modelId: model.modelId, reasoningChoices: model.reasoningChoices }));
    return { availableModels };
  }
}
