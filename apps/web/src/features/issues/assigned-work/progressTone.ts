import type { StageTabState } from "./stageTabs";

export type StateTone = { bar: string; badge: string; headline: string; label: string; count: string };

export const STATE_TONE: Record<StageTabState, StateTone> = {
  current: { bar: "bg-project", badge: "border-project/40 bg-project-wash text-project-ink", headline: "text-ink", label: "text-project-ink", count: "bg-project-wash text-project-ink" },
  yours: { bar: "bg-clarify", badge: "border-clarify/50 bg-clarify-wash text-clarify-ink", headline: "text-clarify-ink", label: "text-clarify-ink", count: "bg-clarify-wash text-clarify-ink" },
  failed: { bar: "bg-destructive", badge: "border-destructive/40 bg-github-wash text-destructive", headline: "text-destructive", label: "text-destructive", count: "bg-github-wash text-destructive" },
  done: { bar: "bg-merge", badge: "border-merge/40 bg-merge-wash text-merge-ink", headline: "text-ink", label: "text-merge-ink", count: "bg-merge-wash text-merge-ink" },
  pending: { bar: "bg-line", badge: "border-dashed border-ink-3 text-ink-2", headline: "text-ink-2", label: "text-ink-3", count: "bg-ink/5 text-ink-2" },
};
