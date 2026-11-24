export const MODELS = ["opus", "sonnet", "haiku"] as const;
export const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type Model = (typeof MODELS)[number];
export type Effort = (typeof EFFORTS)[number];
export type Combo = { model: Model; effort: Effort };

export function allCombos(): Combo[] {
  return MODELS.flatMap((model) => EFFORTS.map((effort) => ({ model, effort })));
}
