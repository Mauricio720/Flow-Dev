"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { projectWorkPath, projectWorkTaskPath } from "@/lib/navigation/projectRoutes";
import type { QueueLoad } from "../contract";
import { useClaim } from "../hooks/useClaim";
import { useWorkQueue } from "../hooks/useWorkQueue";
import { QueueAvailability, QueueFailure } from "./QueueNotices";
import { QueueRow } from "./QueueRow";

type Props = { projectId: string; initial: QueueLoad };

export function ReadyQueue({ projectId, initial }: Props) {
  const router = useRouter();
  const queue = useWorkQueue(projectId, initial);
  const claims = useClaim(projectId, (taskId) => router.push(projectWorkTaskPath(projectId, taskId)));
  return (
    <section aria-labelledby="ready-queue-title" className="overflow-hidden rounded-xl border border-line bg-raised">
      <div className="flex h-13 items-center justify-between gap-3 border-b border-line px-5">
        <h2 id="ready-queue-title" className="text-[15px] font-semibold">Atribuídas a você em Ready</h2>
        <Button type="button" variant="ghost" size="sm" disabled={queue.busy} onClick={() => void queue.refresh()}>Atualizar</Button>
      </div>
      {queue.failure && <QueueFailure failure={queue.failure} returnPath={projectWorkPath(projectId)} onRetry={() => void queue.refresh()} />}
      {queue.items.length > 0 && (
        <ul aria-label="Issues em Ready" className="divide-y divide-line">
          {queue.items.map((item) => <QueueRow key={item.issueNodeId} projectId={projectId} item={item} phase={claims.phaseOf(item.issueNodeId)} onClaim={(target) => void claims.claim(target)} />)}
        </ul>
      )}
      <QueueAvailability state={queue} />
      {queue.nextCursor && <div className="border-t border-line px-5 py-3"><Button type="button" variant="outline" size="sm" disabled={queue.busy} onClick={() => void queue.loadMore()}>Carregar mais</Button></div>}
    </section>
  );
}
