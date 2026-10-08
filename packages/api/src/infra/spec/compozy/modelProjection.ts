import type { ControlErrorCode } from "../../../application/software/controlErrors";
import type { ProviderModel } from "../../../application/software/compozyControlGateway";
import type { CompozyModelRow } from "./compozyControlSchemas";

const LIVE_STATE = "available_live";
const UNAVAILABLE_STATES = ["unavailable_live", "unavailable_stale"];

function unselectableReason(row: CompozyModelRow): ControlErrorCode | null {
  if (row.hidden || row.deprecated) return "model_unavailable";
  if (UNAVAILABLE_STATES.includes(row.availability_state)) return "model_unavailable";
  if (row.availability_state !== LIVE_STATE) return "catalog_stale";
  return row.stale ? "catalog_stale" : null;
}

export function projectModel(row: CompozyModelRow): ProviderModel {
  const reason = unselectableReason(row);
  const efforts = reason ? [] : [...new Set(row.reasoning_efforts ?? [])];
  return {
    providerId: row.provider_id,
    modelId: row.model_id,
    displayName: row.display_name ?? row.model_id,
    selectable: reason === null,
    unselectableReason: reason,
    reasoningChoices: reason ? [] : [null, ...efforts],
  };
}

export function reasoningSupported(model: ProviderModel, effort: string | null) {
  return model.reasoningChoices.includes(effort);
}
