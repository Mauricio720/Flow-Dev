export const READINESS_LAYERS = ["application", "account", "runtime", "host"] as const;

export type ReadinessLayer = (typeof READINESS_LAYERS)[number];
export type ReadinessState = "ready" | "blocked" | "unknown";

export type LayerReadiness = {
  layer: ReadinessLayer;
  state: ReadinessState;
  reasonCode: string | null;
};

export type ReadinessProjection = {
  layers: Record<ReadinessLayer, LayerReadiness>;
  checkedAt: Date;
  stale: boolean;
};

export type LayerInput = { state: ReadinessState; reasonCode?: string | null } | null | undefined;

export type ReadinessInput = {
  application: LayerInput;
  account: LayerInput;
  runtime: LayerInput;
  host: LayerInput;
  checkedAt: Date;
  now: Date;
};
