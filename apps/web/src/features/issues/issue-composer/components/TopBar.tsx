import type { ReactNode } from "react";
import { GridIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

type Props = { title: string; grid: boolean; onToggleGrid: () => void; rail: ReactNode; sources: ReactNode };

export function TopBar({ title, grid, onToggleGrid, rail, sources }: Props) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-3 border-b border-line bg-ground px-3 sm:px-4">
      {rail}
      <p className="min-w-0 truncate text-xs text-ink-3" title={title}>{title}</p>
      <div className="ml-auto flex items-center gap-1">
        {sources}
        <Button type="button" variant="ghost" size="sm" onClick={onToggleGrid} aria-pressed={grid} title="Mostrar a grade do trilho" className={grid ? "bg-ink/[0.07] text-ink" : undefined}>
          <GridIcon />
          <span className="hidden sm:inline">Grade</span>
        </Button>
      </div>
    </div>
  );
}
