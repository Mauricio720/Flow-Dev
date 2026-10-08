import { cn } from "@/lib/utils";
import { STATE_LABELS } from "../copy";

const TONE: Record<string, string> = {
  ready: "text-merge-ink",
  blocked: "text-github-ink",
  unknown: "text-clarify-ink",
};
const MARK: Record<string, string> = { ready: "✓", blocked: "✕", unknown: "?" };

export function StateText({ state }: { state: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", TONE[state])}>
      <span aria-hidden="true" className="font-mono">{MARK[state]}</span>
      {STATE_LABELS[state] ?? state}
    </span>
  );
}
