"use client";

import { useEffect } from "react";
import type { TaskDetail } from "../contract";
import { useArtifactViewer } from "../hooks/useArtifactViewer";
import { useTaskSet } from "../hooks/useTaskSet";
import type { TaskSetView } from "../taskSetContract";
import { NO_TASKS_NOTE, TASKS_STAGE_LABEL, TASK_SET_LOADING } from "../taskSetCopy";
import type { TerminalScope } from "../terminalContract";
import { GenerateTasksAction } from "./GenerateTasksAction";
import { TaskSetBody } from "./TaskSetBody";

type Props = { scope: TerminalScope; detail: TaskDetail; reader: boolean; onView?: (view: TaskSetView) => void; onOpened?: () => Promise<void> | void; onConversation?: (sessionId: string) => void };

const Failure = ({ message }: { message: string }) => <p role="alert" className="text-sm text-destructive">{message}</p>;

export function TasksStage({ scope, detail, reader, onView, onOpened, onConversation }: Props) {
  const { data, failure, refresh } = useTaskSet(scope, { enabled: true, poll: true });
  const viewer = useArtifactViewer(scope);
  useEffect(() => {
    if (data && onView) onView(data);
  }, [data, onView]);
  const opened = async () => {
    await refresh();
    await onOpened?.();
  };
  if (!data) return failure ? <Failure message={failure} /> : <p role="status" className="text-sm text-ink-2">{TASK_SET_LOADING}</p>;
  return (
    <section aria-label={TASKS_STAGE_LABEL} className="space-y-10">
      {failure ? <Failure message={failure} /> : null}
      {data.set === null ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-line px-4 py-4"><p className="text-sm text-ink-2">{NO_TASKS_NOTE}</p>{reader ? null : <GenerateTasksAction detail={detail} specs={data.specs} onOpened={opened} />}</div> : <TaskSetBody scope={scope} set={data.set} specs={data.specs} detail={detail} viewer={viewer} reader={reader} onOpened={opened} onConversation={onConversation} />}
    </section>
  );
}
