import type { ReactNode } from "react";

type Props = { id: string; title: string; action?: ReactNode; children: ReactNode };

export function OverviewPanel({ id, title, action, children }: Props) {
  return (
    <section aria-labelledby={id} className="overflow-hidden rounded-xl border border-line bg-raised">
      <div className="flex h-13 items-center justify-between gap-3 border-b border-line px-5">
        <h2 id={id} className="text-[15px] font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
