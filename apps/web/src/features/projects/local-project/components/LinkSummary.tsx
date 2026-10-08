import type { ReactNode } from "react";
import type { LocalLink } from "../contract";
import { LINK_TITLE, READINESS_NOTE, REASON_MESSAGE } from "../localProjectCopy";
import { ReadinessCapsule } from "./ReadinessCapsule";

type Props = { link: LocalLink; children: ReactNode };

export function LinkSummary({ link, children }: Props) {
  return (
    <section aria-label="Seu checkout vinculado" className="overflow-hidden rounded-xl border border-line bg-raised">
      <header className="flex min-h-[52px] flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-5 py-2.5">
        <h2 className="text-[15px] font-semibold">{LINK_TITLE}</h2>
        <ReadinessCapsule readiness={link.readiness} />
      </header>
      <div className="space-y-3 px-5 py-4">
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-ink-3">Máquina</dt>
          <dd className="font-medium [overflow-wrap:anywhere]">{link.machineLabel}</dd>
          <dt className="text-ink-3">Checkout</dt>
          <dd className="font-medium [overflow-wrap:anywhere]">{link.projectLabel}</dd>
        </dl>
        <p className="max-w-[65ch] text-sm text-ink-2">{READINESS_NOTE[link.readiness]}</p>
        {link.readinessCode && <p className="max-w-[65ch] text-sm text-destructive">{REASON_MESSAGE[link.readinessCode] ?? READINESS_NOTE.blocked}</p>}
      </div>
      <footer className="border-t border-line bg-surface px-5 py-3">{children}</footer>
    </section>
  );
}
