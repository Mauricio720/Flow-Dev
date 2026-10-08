import type { Dispatch } from "react";
import { taskFailure } from "@/lib/tasks/taskFailure";
import { drainEventsAfter, readLatestEvents, readOlderEvents, readSpecSnapshot, type SpecTarget } from "./specReads";
import type { SpecAction, SpecState } from "./specSnapshotState";

export type ReaderTracker = { inFlight: boolean; loadedEvents: boolean };
type Context = { target: SpecTarget; scope: string; dispatch: Dispatch<SpecAction>; tracker: () => ReaderTracker; state: SpecState };

export function createSpecReader({ target, scope, dispatch, tracker, state }: Context) {
  async function readEvents(latest: string) {
    if (!tracker().loadedEvents) {
      const page = await readLatestEvents(target);
      tracker().loadedEvents = true;
      dispatch({ type: "events", scope, items: page.items, after: latest, older: page.older });
      return;
    }
    const drained = await drainEventsAfter(target, state.afterCursor ?? latest);
    dispatch({ type: "events", scope, items: drained.items, after: drained.after });
  }
  async function refresh() {
    if (tracker().inFlight) return;
    tracker().inFlight = true;
    try {
      const snapshot = await readSpecSnapshot(target);
      dispatch({ type: "snapshot", scope, snapshot });
      if (snapshot.eventCursor) await readEvents(snapshot.eventCursor);
    } catch (error) {
      dispatch({ type: "failed", scope, failure: taskFailure(error) });
    } finally {
      tracker().inFlight = false;
    }
  }
  async function loadOlder() {
    if (!state.olderCursor) return;
    const page = await readOlderEvents(target, state.olderCursor).catch(() => null);
    if (page) dispatch({ type: "events", scope, items: page.items, after: null, older: page.older });
  }
  return { refresh, loadOlder };
}
