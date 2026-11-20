export type ExecutionLogEvent = "execution.start" | "execution.dispatch_failed" | "execution.state_changed" | "execution.spec_review";

export function logExecutionEvent(event: ExecutionLogEvent, fields: Record<string, unknown>) {
  console.info(JSON.stringify({ event, ...fields }));
}
