"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { XIcon } from "@/components/icons";
import { useWorkspace } from "../hooks/useWorkspace";
import { Composer } from "./Composer";
import { EmptyIntent } from "./EmptyIntent";
import { SessionRail } from "./SessionRail";
import { SourcesPanel } from "./SourcesPanel";
import { Thread } from "./Thread";
import { TopBar } from "./TopBar";

const GRID_KEY = "flow-dev:grid";
const gridListeners = new Set<() => void>();

// The grid preference is a per-viewer convenience; storage may be unavailable, so it falls back to "on".
const gridStore = {
  subscribe(listener: () => void) {
    gridListeners.add(listener);
    return () => gridListeners.delete(listener);
  },
  read() {
    try {
      return window.localStorage.getItem(GRID_KEY) !== "off";
    } catch {
      return true;
    }
  },
  write(on: boolean) {
    try {
      window.localStorage.setItem(GRID_KEY, on ? "on" : "off");
    } catch {}
    gridListeners.forEach((listener) => listener());
  },
};

export function Workspace({ projectId, projectName }: { projectId?: string; projectName?: string }) {
  const { sessions, active, send, updateDraft, publish, create, select } = useWorkspace();
  const grid = useSyncExternalStore(gridStore.subscribe, gridStore.read, () => true);
  const [railOpen, setRailOpen] = useState(false);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const scroller = useRef<HTMLDivElement>(null);

  const toggleGrid = () => gridStore.write(!grid);

  // Opening a session lands on its draft interchange; growth inside the open session follows the newest row.
  const growth = active.items.map((i) => (i.kind === "tools" ? i.calls.length : i.kind === "draft" ? i.status : i.kind)).join();
  const seenGrowth = useRef<Record<string, string>>({});
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const anchor = [...el.querySelectorAll<HTMLElement>("[data-anchor=draft]")].at(-1);
    const top = anchor ? anchor.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 24 : el.scrollHeight;
    el.scrollTo({ top });
  }, [active.id]);
  useEffect(() => {
    const el = scroller.current;
    const previous = seenGrowth.current[active.id];
    seenGrowth.current[active.id] = growth;
    if (el && previous !== undefined && previous !== growth) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [active.id, growth]);

  const last = active.items.at(-1);
  const merged = active.items.some((item) => item.kind === "draft" && item.status === "published");
  const suggestions = active.phase === "awaiting" && last?.kind === "clarify" ? last.suggestions : [];

  function pick(id: string) {
    select(id);
    setRailOpen(false);
  }

  return (
    <div className="flex h-dvh flex-col">
      <TopBar projectId={projectId} projectName={projectName} grid={grid} onToggleGrid={toggleGrid} onOpenRail={() => setRailOpen(true)} />

      <div className="grid min-h-0 flex-1 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_18rem]">
        <div className="hidden min-h-0 border-r border-line bg-surface lg:block">
          <SessionRail sessions={sessions} activeId={active.id} onSelect={pick} onCreate={create} />
        </div>

        <main className="relative flex min-h-0 flex-col">
          <div
            ref={scroller}
            className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${grid ? "cell-grid" : ""}`}
            style={{ backgroundPosition: "50% 0" }}
          >
            <div className="mx-auto flex w-full max-w-[768px] flex-1 flex-col px-3 pt-10 sm:px-0">
              {active.items.length === 0 ? (
                <div className="flex flex-1 flex-col justify-end">
                  <EmptyIntent onPick={(text) => setTexts((t) => ({ ...t, [active.id]: text }))} />
                </div>
              ) : (
                <>
                  <Thread session={active} onDraftChange={updateDraft} onPublish={publish} />
                  <div className="relative flex-1" aria-hidden="true">
                    <span className={`absolute top-0 bottom-0 left-[11px] w-[2px] ${merged ? "bg-merge" : "bg-ink"}`} />
                  </div>
                </>
              )}
            </div>
            <div className="sticky bottom-0 bg-[linear-gradient(to_bottom,transparent,var(--ground)_1.5rem)]">
              <div className="mx-auto w-full max-w-[768px] px-3 sm:px-0">
                <Composer
                  phase={active.phase}
                  suggestions={suggestions}
                  hasItems={active.items.length > 0}
                  merged={merged}
                  draftText={texts[active.id] ?? ""}
                  onDraftText={(text) => setTexts((t) => ({ ...t, [active.id]: text }))}
                  onSend={send}
                />
              </div>
            </div>
          </div>
        </main>

        <div className="hidden min-h-0 border-l border-line bg-surface xl:block">
          <SourcesPanel session={active} />
        </div>
      </div>

      {railOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Intenções">
          <button type="button" aria-label="Fechar" className="absolute inset-0 bg-ink/30" onClick={() => setRailOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[min(20rem,86vw)] border-r border-line bg-surface shadow-raised">
            <button
              type="button"
              onClick={() => setRailOpen(false)}
              aria-label="Fechar intenções"
              className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-ink/5"
            >
              <XIcon />
            </button>
            <div className="h-full pt-10">
              <SessionRail
                sessions={sessions}
                activeId={active.id}
                onSelect={pick}
                onCreate={() => {
                  create();
                  setRailOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
