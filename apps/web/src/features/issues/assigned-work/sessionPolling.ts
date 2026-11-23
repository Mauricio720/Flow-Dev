import { fetchSessionTimeline } from "./sessionClient";
import type { SessionScope, SessionTimeline } from "./sessionContract";
import { SESSION_POLL_MS, isFinalStatus, nextPoll } from "./sessionTimelineModel";

export type PollingHandlers = { onPage: (page: SessionTimeline, full: boolean) => void; onFailure: () => void };

export function startTimelinePolling(scope: SessionScope, handlers: PollingHandlers) {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cursor: string | undefined;
  const schedule = (delay: number) => {
    timer = setTimeout(() => void load(), delay);
  };
  async function load() {
    const full = cursor === undefined;
    try {
      const page = await fetchSessionTimeline(scope, cursor);
      if (!active) return;
      handlers.onPage(page, full);
      const step = nextPoll({ final: isFinalStatus(page.status), full, cursor: page.cursor });
      cursor = step.cursor;
      if (step.delay !== null) schedule(step.delay);
    } catch {
      if (!active) return;
      handlers.onFailure();
      schedule(SESSION_POLL_MS);
    }
  }
  void load();
  return () => {
    active = false;
    if (timer) clearTimeout(timer);
  };
}
