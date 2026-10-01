import type { ReactNode } from "react";

type Props = { label: string; htmlFor?: string; children: ReactNode };

export function DraftField({ label, htmlFor, children }: Props) {
  return (
    <div className="grid gap-1.5 border-t border-line px-5 py-4 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-6">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="pt-0.5 text-sm text-ink-3">
          {label}
        </label>
      ) : (
        <span className="pt-0.5 text-sm text-ink-3">{label}</span>
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
