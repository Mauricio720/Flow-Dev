import type { SpecSnapshot } from "./specContract";
import { SPEC_TITLE } from "./specCopy";
import { STATE_LABEL, specLifecycle } from "./specStageModel";

export function SpecHeader({ snapshot }: { snapshot: SpecSnapshot }) {
  const lifecycle = specLifecycle(snapshot);
  return (
    <header className="flex min-h-[52px] flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-3">
      <h2 className="text-[17px] font-semibold">{SPEC_TITLE}</h2>
      <span className="rounded-full border border-line px-2.5 py-0.5 text-sm text-ink-2">{lifecycle === "unknown" ? "Estado desconhecido" : STATE_LABEL[lifecycle]}</span>
    </header>
  );
}
