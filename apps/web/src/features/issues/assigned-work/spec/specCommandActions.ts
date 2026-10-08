import type { Dispatch } from "react";
import { ASYNCHRONOUS_ACTIONS, keyedSpecCommand, type SpecCommandEvent, type SpecCommandState, type SpecRequest } from "./specCommandState";
import { createSpecResponders } from "./specCommandResponders";
import type { SpecFailure } from "./specContract";
import { dispatchSpec } from "./specDispatch";
import { saveSpecPending, type PendingScope } from "./specPendingStore";

export type SpecCommandInput = PendingScope & { specVersion: number; onChanged: () => Promise<void> | void; onFailure: (failure: SpecFailure) => void };
type Context = { input: SpecCommandInput; dispatch: Dispatch<SpecCommandEvent>; latest: () => SpecCommandState };

export function createSpecCommandActions({ input, dispatch, latest }: Context) {
  const scope: PendingScope = { viewerId: input.viewerId, projectId: input.projectId, taskId: input.taskId };
  const target = { projectId: input.projectId, taskId: input.taskId };
  const { settle, fail, observe } = createSpecResponders({ scope, dispatch, onChanged: input.onChanged, onFailure: input.onFailure });
  async function run(request: SpecRequest) {
    if (latest().phase === "sending") return;
    const pending = keyedSpecCommand(latest(), request, input.specVersion);
    saveSpecPending(scope, pending);
    dispatch({ type: "begin", pending });
    try {
      const receipt = await dispatchSpec(target, pending);
      const asynchronous = ASYNCHRONOUS_ACTIONS.includes(request.action) && receipt.status === "accepted";
      dispatch({ type: "accepted", asynchronous });
      if (!asynchronous) await settle();
    } catch (error) { fail(error); }
  }
  const reconcile = async () => { const pending = latest().pending; if (pending) await observe(pending).catch(fail); };
  return { scope, run, observe, fail, reconcile };
}
