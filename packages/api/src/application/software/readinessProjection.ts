import {
  READINESS_LAYERS,
  type LayerInput,
  type LayerReadiness,
  type ReadinessInput,
  type ReadinessLayer,
  type ReadinessProjection,
} from "./readiness";

export const READINESS_STALE_AFTER_MS = 60_000;
const VALID_STATES = ["ready", "blocked", "unknown"];
const MISSING_CHECK = "check_missing";
const MALFORMED_CHECK = "check_malformed";
const CONTRADICTORY_CHECK = "check_contradictory";

function projectLayer(layer: ReadinessLayer, input: LayerInput): LayerReadiness {
  if (!input) return { layer, state: "unknown", reasonCode: MISSING_CHECK };
  if (!VALID_STATES.includes(input.state)) return { layer, state: "unknown", reasonCode: MALFORMED_CHECK };
  const reasonCode = input.reasonCode ?? null;
  if (input.state === "ready" && reasonCode) return { layer, state: "unknown", reasonCode: CONTRADICTORY_CHECK };
  if (input.state === "blocked" && !reasonCode) return { layer, state: "unknown", reasonCode: CONTRADICTORY_CHECK };
  return { layer, state: input.state, reasonCode };
}

export function projectReadiness(input: ReadinessInput): ReadinessProjection {
  const layers = Object.fromEntries(
    READINESS_LAYERS.map((layer) => [layer, projectLayer(layer, input[layer])]),
  ) as ReadinessProjection["layers"];
  const stale = input.now.getTime() - input.checkedAt.getTime() > READINESS_STALE_AFTER_MS;
  return { layers, checkedAt: input.checkedAt, stale };
}

export function canAuthorizeNewStart(projection: ReadinessProjection) {
  if (projection.stale) return false;
  return READINESS_LAYERS.every((layer) => projection.layers[layer].state === "ready");
}
