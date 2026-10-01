"use client";

import { PlusIcon } from "@/components/icons";
import type { Session } from "../model";

type Props = {
  sessions: Session[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
};

function Status({ session }: { session: Session }) {
  const published = session.items.findLast((item) => item.kind === "draft" && item.status === "published");
  switch (session.phase) {
    case "awaiting":
      return <span className="text-clarify-ink">aguardando você</span>;
    case "draft":
      return <span className="text-merge-ink">draft pronto</span>;
    case "thinking":
      return <span className="text-project-ink">consultando…</span>;
    case "published":
      return <span className="text-ink-3">#{published?.kind === "draft" ? published.issueNumber : ""} publicada</span>;
    case "new":
      return <span className="text-ink-3">rascunho vazio</span>;
  }
}

function RailNode({ phase }: { phase: Session["phase"] }) {
  const base = "absolute top-[15px] left-[19px] -translate-x-1/2";
  switch (phase) {
    case "awaiting":
      return <span className={`${base} size-2.5 rounded-full border-2 border-clarify bg-surface`} />;
    case "draft":
      return <span className={`${base} size-2.5 rounded-[2px] border-2 border-merge bg-surface`} />;
    case "thinking":
      return <span className={`${base} node-running size-2.5 rounded-full bg-project`} />;
    case "published":
      return <span className={`${base} size-2.5 rounded-full bg-merge`} />;
    case "new":
      return <span className={`${base} size-2.5 rounded-full border-[1.5px] border-dashed border-ink-3 bg-surface`} />;
  }
}

export function SessionRail({ sessions, activeId, onSelect, onCreate }: Props) {
  return (
    <nav aria-label="Intenções" className="flex h-full flex-col">
      <div className="p-3">
        <button
          type="button"
          onClick={onCreate}
          className="flex h-10 w-full items-center gap-2 rounded-lg border border-line bg-raised px-3 text-sm font-medium transition-colors hover:border-ink-3"
        >
          <PlusIcon />
          Nova intenção
        </button>
      </div>
      <h2 className="px-4 pt-2 pb-2 text-xs font-medium text-ink-3">Intenções</h2>
      <ul className="relative flex-1 overflow-y-auto px-2 pb-4">
        <span aria-hidden="true" className="absolute top-2 bottom-6 left-[26px] w-px bg-line" />
        {sessions.map((session) => {
          const active = session.id === activeId;
          return (
            <li key={session.id} className="relative">
              <button
                type="button"
                onClick={() => onSelect(session.id)}
                aria-current={active ? "page" : undefined}
                className={`relative w-full rounded-lg py-2 pr-3 pl-9 text-left transition-colors ${
                  active ? "bg-raised shadow-raised" : "hover:bg-ink/[0.04]"
                }`}
              >
                <RailNode phase={session.phase} />
                <span className={`block truncate text-sm ${active ? "font-medium text-ink" : "text-ink-2"}`}>{session.title}</span>
                <span className="mt-0.5 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-mono text-ink-3">{session.branch}</span>
                </span>
                <span className="mt-0.5 block text-xs">
                  <Status session={session} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
