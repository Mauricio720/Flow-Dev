"use client";

import type { ReactNode } from "react";
import { useStageScroll } from "../hooks/useStageScroll";

type Props = { grid: boolean; merged: boolean; growth: string; trunk: boolean; thread: ReactNode; footer: ReactNode };

export function StageFrame({ grid, merged, growth, trunk, thread, footer }: Props) {
  const scroller = useStageScroll(growth);
  return (
    <div ref={scroller} className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${grid ? "cell-grid" : ""}`} style={{ backgroundPosition: "50% 0" }}>
      <div className="mx-auto flex w-full max-w-[768px] flex-1 flex-col px-3 pt-10 sm:px-0">
        {trunk ? thread : <div className="flex flex-1 flex-col justify-end">{thread}</div>}
        {trunk && (
          <div className="relative flex-1" aria-hidden="true">
            <span className={`absolute top-0 bottom-0 left-[11px] w-[2px] ${merged ? "bg-merge" : "bg-ink"}`} />
          </div>
        )}
      </div>
      <div className="sticky bottom-0 bg-[linear-gradient(to_bottom,transparent,var(--ground)_1.5rem)]">
        <div className="mx-auto w-full max-w-[768px] px-3 sm:px-0">{footer}</div>
      </div>
    </div>
  );
}
