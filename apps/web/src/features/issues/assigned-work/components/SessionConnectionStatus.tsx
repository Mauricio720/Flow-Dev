import { Button } from "@/components/ui/button";
import { formatMoment } from "@/lib/tasks/formatMoment";
import type { ExecutionSession } from "../executionContract";
import { sessionStatusLabel } from "../executionModel";
import type { SessionTimelineState } from "../hooks/useSessionTimeline";
import { LOAD_FAILED_NOTE, SESSION_CHECKED_AT_LABEL, SESSION_CHECKING_LABEL, SESSION_LAST_STATUS_LABEL, SESSION_REFRESH_FAILED_LABEL, SESSION_RETRY_LABEL, SESSION_RETRYING_LABEL } from "../sessionCopy";
import { ExecutionStatus } from "./ExecutionStatus";

type Props = { session: ExecutionSession; reader: boolean; timeline: SessionTimelineState };

function RefreshFailure({ session, reader, timeline }: Props) {
  return (
    <div className="space-y-2">
      <div role="status" className="space-y-1">
        <p className="text-[15px] font-semibold text-ink">{SESSION_REFRESH_FAILED_LABEL}</p>
        <p className="max-w-prose text-sm text-ink-2">{LOAD_FAILED_NOTE}</p>
      </div>
      <p className="text-xs text-ink-3">{SESSION_LAST_STATUS_LABEL} {sessionStatusLabel(session, { reader })}</p>
      <Button type="button" variant="secondary" disabled={timeline.refreshing} onClick={timeline.retry}>{timeline.refreshing ? SESSION_RETRYING_LABEL : SESSION_RETRY_LABEL}</Button>
    </div>
  );
}

export function SessionConnectionStatus(props: Props) {
  const { session, reader, timeline } = props;
  return (
    <div className="space-y-2">
      {timeline.failed ? <RefreshFailure {...props} /> : timeline.loaded ? <ExecutionStatus session={session} reader={reader} /> : <p role="status" className="text-[15px] font-semibold">{SESSION_CHECKING_LABEL}</p>}
      {timeline.checkedAt && <p className="text-xs text-ink-3">{SESSION_CHECKED_AT_LABEL} <time dateTime={timeline.checkedAt} className="font-mono tabular-nums">{formatMoment(timeline.checkedAt)}</time></p>}
    </div>
  );
}
