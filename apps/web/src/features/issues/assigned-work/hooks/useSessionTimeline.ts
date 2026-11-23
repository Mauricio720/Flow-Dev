"use client";

import { useEffect, useState } from "react";
import type { SessionScope } from "../sessionContract";
import { startTimelinePolling } from "../sessionPolling";
import { EMPTY_TIMELINE, mergeTimeline, replaceTimeline, type TimelineView } from "../sessionTimelineModel";

export function useSessionTimeline({ projectId, taskId, sessionId }: SessionScope) {
  const [view, setView] = useState<TimelineView>(EMPTY_TIMELINE);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const onPage: Parameters<typeof startTimelinePolling>[1]["onPage"] = (page, full) => {
      setFailed(false);
      setLoaded(true);
      setView((current) => (full ? replaceTimeline(page) : mergeTimeline(current, page)));
    };
    return startTimelinePolling({ projectId, taskId, sessionId }, { onPage, onFailure: () => setFailed(true) });
  }, [projectId, taskId, sessionId]);
  return { ...view, loaded, failed };
}

export type SessionTimelineState = ReturnType<typeof useSessionTimeline>;
