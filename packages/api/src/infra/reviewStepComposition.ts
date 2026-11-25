import { ReviewCycleFinisher } from "../application/services/review/reviewCycleFinisher";
import { ReviewCycleStep } from "../application/services/review/reviewCycleStep";
import { ReviewMessenger } from "../application/services/review/reviewMessenger";
import { ReviewStageLoader } from "../application/services/review/reviewStageLoader";
import { ReviewStepActions } from "../application/services/review/reviewStepActions";
import { ReviewStepFailure } from "../application/services/review/reviewStepFailure";
import { ReviewStepGuards } from "../application/services/review/reviewStepGuards";
import { ReviewStepOpen } from "../application/services/review/reviewStepOpen";
import { ReviewStepTurn } from "../application/services/review/reviewStepTurn";
import { SystemMessageSender } from "../application/services/terminal/systemMessageSender";
import { FsCheckoutFileReader } from "./terminal/fsCheckoutFileReader";
import type { WorkerParts } from "./sessionWorkerParts";

export function buildReviewStep(parts: WorkerParts) {
  const { identity, log, now, recorder } = parts;
  const failure = new ReviewStepFailure({ cycles: parts.reviewCycles, now, log });
  const open = new ReviewStepOpen({ cycles: parts.reviewCycles, launcher: parts.reviewLauncher, failure, hostId: identity.hostId, now, log });
  const messenger = new ReviewMessenger({ messages: new SystemMessageSender({ messages: parts.messages }), now, log });
  const finisher = new ReviewCycleFinisher({ cycles: parts.reviewCycles, controls: parts.control, log });
  const loader = new ReviewStageLoader({ cycles: parts.reviewCycles, files: new FsCheckoutFileReader(), captureStop: (sessionId) => recorder.captureStop(sessionId) });
  const turn = new ReviewStepTurn({ cycles: parts.reviewCycles, loader, open, messenger, finisher, now, log });
  const guards = new ReviewStepGuards({ cycles: parts.reviewCycles, claims: parts.reviewClaims, planning: parts.sessions, taskSets: parts.reviewTaskSets, finish: (cycle, at, reason) => finisher.finish(cycle, at, reason), now });
  const actions = new ReviewStepActions({ cycles: parts.reviewCycles, open, messenger, finish: (cycle, at) => finisher.finish(cycle, at), now });
  return new ReviewCycleStep({ cycles: parts.reviewCycles, open, actions, guards, failure, turn, hostId: identity.hostId, log });
}
