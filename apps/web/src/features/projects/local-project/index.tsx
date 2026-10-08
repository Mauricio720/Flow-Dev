"use client";

import type { Project } from "@/lib/projects/contract";
import { FolderLinkAction } from "./components/FolderLinkAction";
import { LinkSummary } from "./components/LinkSummary";
import { NoLinkNotice, RefreshNotice, UnavailableNotice } from "./components/LocalNotices";
import { PreparationEntry } from "./components/PreparationEntry";
import type { LocalProjectActions, LocalProjectLoad } from "./contract";
import { useFolderLink } from "./hooks/useFolderLink";
import { useLocalLink } from "./hooks/useLocalLink";
import { localProjectActions } from "./localProjectClient";

type Props = { project: Project; initial: LocalProjectLoad; actions?: LocalProjectActions; pollMs?: number };

export function LocalProjectSettings({ project, initial, actions = localProjectActions, pollMs }: Props) {
  const link = useLocalLink({ projectId: project.id, initial, actions });
  const folder = useFolderLink({ projectId: project.id, actions, pollMs, onLinked: link.refresh });
  const { load } = link;
  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-8 sm:py-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">Projeto local</h1>
          <p className="max-w-2xl text-[15px] leading-7 text-ink-2">O seu checkout de {project.name} neste computador. É privado: outras pessoas do projeto não veem a sua máquina nem a sua pasta.</p>
        </header>
        {link.notice && <RefreshNotice message={link.notice} busy={link.busy} onRefresh={() => void link.refresh()} />}
        {load.kind === "unavailable" && <UnavailableNotice />}
        {load.kind === "none" && <NoLinkNotice><FolderLinkAction folder={folder} disabled={link.busy} /></NoLinkNotice>}
        {load.kind === "ready" && <LinkSummary link={load.link}><FolderLinkAction folder={folder} disabled={link.busy} onUnlink={() => void link.unlink(load.link)} /></LinkSummary>}
        {load.kind === "ready" && <PreparationEntry projectId={project.id} />}
      </div>
    </main>
  );
}
