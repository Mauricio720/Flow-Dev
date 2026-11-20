import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { loadFailureCopy } from "./compozyCopy";
import type { CompozyLoad } from "./useCompozyBinding";

export const COMPOZY_HEADING_ID = "settings-compozy";

export function CompozySection({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby={COMPOZY_HEADING_ID} className="mt-10 flex flex-col gap-4">
      <h2 id={COMPOZY_HEADING_ID} className="text-[15px] font-semibold">Execução no CompozyOS</h2>
      {children}
    </section>
  );
}

export function CompozyPendingLoad({ load }: { load: Exclude<CompozyLoad, { kind: "loaded" }> }) {
  if (load.kind === "failed") return <p role="alert" className="text-sm text-destructive">{loadFailureCopy(load.reason)}</p>;
  return (
    <div aria-busy="true" className="flex flex-col gap-2 rounded-xl border border-line bg-surface px-5 py-4">
      <span className="sr-only">Carregando o vínculo com o CompozyOS…</span>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
