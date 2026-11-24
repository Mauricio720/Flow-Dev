"use client";

import { useCallback, useState } from "react";
import type { TaskDetail } from "../contract";
import { SPEC_TAB_ID, SPEC_TAB_LABEL, TASKS_TAB_ID, TASKS_TAB_LABEL, tasksTabState, type StageTab } from "../stageTabs";
import type { TaskSetView } from "../taskSetContract";
import { hasTasksTab } from "../taskSetModel";
import type { TerminalScope } from "../terminalContract";
import { SpecStage } from "../components/SpecStage";
import { TasksStage } from "../components/TasksStage";
import { useTaskSet } from "./useTaskSet";

type Input = { detail: TaskDetail; approved: boolean; reader: boolean; refresh: () => Promise<void>; onConversation: (sessionId: string) => void };
type SpecTabInput = { scope: TerminalScope; view: TaskSetView; detail: TaskDetail; reader: boolean; onOpened: () => Promise<void> };

function specTabOf({ scope, view, detail, reader, onOpened }: SpecTabInput): StageTab | null {
  if (view.specs.length === 0) return null;
  const panel = <SpecStage scope={scope} specs={view.specs} detail={detail} canGenerate={!reader && view.set === null} onOpened={onOpened} />;
  return { id: SPEC_TAB_ID, label: SPEC_TAB_LABEL, state: "done", panel };
}

export function useTasksTab({ detail, approved, reader, refresh, onConversation }: Input): { tab: StageTab | null; specTab: StageTab | null; hasSet: boolean } {
  const scope = { projectId: detail.task.projectId, taskId: detail.task.id };
  const [live, setLive] = useState<TaskSetView | null>(null);
  const [waiting, setWaiting] = useState(true);
  const initial = useTaskSet(scope, { enabled: approved, poll: waiting });
  const onView = useCallback((view: TaskSetView) => setLive(view), []);
  const view = live ?? initial.data;
  if (waiting && view?.set) setWaiting(false);
  if (!hasTasksTab(view)) return { tab: null, specTab: null, hasSet: false };
  const reload = async () => { await initial.refresh(); await refresh(); };
  const panel = <TasksStage scope={scope} detail={detail} reader={reader} onView={onView} onOpened={refresh} onConversation={onConversation} />;
  const specTab = specTabOf({ scope, view, detail, reader, onOpened: reload });
  return { tab: { id: TASKS_TAB_ID, label: TASKS_TAB_LABEL, state: tasksTabState(view), panel }, specTab, hasSet: view.set !== null };
}
