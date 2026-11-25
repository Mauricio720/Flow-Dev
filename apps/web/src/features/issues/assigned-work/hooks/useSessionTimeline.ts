"use client";

import { useCallback, useEffect, useState } from "react";
import type { SessionScope } from "../sessionContract";
import { startTimelinePolling } from "../sessionPolling";
import { EMPTY_TIMELINE, mergeTimeline, replaceTimeline, type TimelineView } from "../sessionTimelineModel";

export function useSessionTimeline({ projectId, taskId, sessionId }: SessionScope) {
  const [view, setView] = useState<TimelineView>(EMPTY_TIMELINE);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(true);
  const [refreshRequest, setRefreshRequest] = useState(0);
  const retry = useCallback(() => {
    setRefreshing(true);
    setRefreshRequest((current) => current + 1);
  }, []);
  useEffect(() => {
    const onPage: Parameters<typeof startTimelinePolling>[1]["onPage"] = (page, full) => {
      setFailed(false);
      setLoaded(true);
      setRefreshing(false);
      setCheckedAt(new Date().toISOString());
      setView((current) => (full ? replaceTimeline(page) : mergeTimeline(current, page)));
    };
    const onFailure = () => { setFailed(true); setRefreshing(false); };
    return startTimelinePolling({ projectId, taskId, sessionId }, { onPage, onFailure });
  }, [projectId, taskId, sessionId, refreshRequest]);
  return { ...view, loaded, failed, checkedAt, refreshing, retry };
}

export type SessionTimelineState = ReturnType<typeof useSessionTimeline>;
