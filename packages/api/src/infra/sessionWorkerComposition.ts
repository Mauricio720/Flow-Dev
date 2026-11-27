import { setTimeout as sleep } from "node:timers/promises";
import { AnswerDispatchStep } from "../application/services/terminal/answerDispatch";
import { HeartbeatStep } from "../application/services/terminal/heartbeatStep";
import { MessageDeliveryStep } from "../application/services/terminal/messageDelivery";
import { OpeningStep } from "../application/services/terminal/openingStep";
import { OrphanRecoveryStep } from "../application/services/terminal/orphanRecovery";
import { SessionControlsStep } from "../application/services/terminal/sessionControls";
import type { SessionHandleRegistry } from "../application/services/terminal/sessionHandleRegistry";
import type { SessionLog } from "../application/services/terminal/sessionLog";
import { SessionResumeStep } from "../application/services/terminal/sessionResume";
import { SessionStarter } from "../application/services/terminal/sessionStarter";
import { SessionSupervisor } from "../application/services/terminal/sessionSupervisor";
import { runSessionLoop } from "../application/services/terminal/sessionWorkerLoop";
import { requireDatabase, requireSql } from "./database/client";
import { killChildProcesses } from "./terminal/killChildProcesses";
import { buildReviewStep } from "./reviewStepComposition";
import { buildPlanRunStep } from "./planRunStepComposition";
import { buildWorkerParts, type WorkerOverrides, type WorkerParts } from "./sessionWorkerParts";

export type { WorkerOverrides } from "./sessionWorkerParts";

type Database = ReturnType<typeof requireDatabase>;
const SHUTDOWN_GRACE_MS = 5_000;

function buildSteps(parts: WorkerParts) {
  const { identity, log, now, registry, messages, status, cancellation, control, handlers, context, runtimes, recorder, accountGate } = parts;
  const starter = new SessionStarter({ sessions: parts.sessions, context, runtimes, handlers, registry, log, accountGate });
  return [
    new OrphanRecoveryStep({ control, messages, cancellation, identity, now, log }),
    new OpeningStep({ control, starter, identity, log }),
    new SessionResumeStep({ status, messages, runtimes, handlers, registry, context, exit: parts.exit, cancellation, identity, now, log, accountGate }),
    new MessageDeliveryStep({ registry, messages, now, log }),
    buildReviewStep(parts),
    buildPlanRunStep(parts),
    new SessionControlsStep({ registry, hostId: identity.hostId, status, controls: control, messages, cancellation, flush: () => handlers.flush(), captureEnd: (sessionId) => recorder.captureEnd(sessionId), now, log }),
    new AnswerDispatchStep({ requests: parts.requests, status, registry: parts.pending, log }),
  ];
}

export function createSessionWorker(database: Database, overrides: WorkerOverrides = {}) {
  const parts = buildWorkerParts(database, overrides);
  const heartbeat = new HeartbeatStep({ hosts: parts.hosts, ...parts.identity, now: parts.now });
  const supervisor = new SessionSupervisor({ heartbeat, steps: buildSteps(parts), log: parts.log });
  const { identity, registry, runtimes, log } = parts;
  const idle = async () => {
    await parts.handlers.flush();
    await parts.tracker.idle();
  };
  const startSecretAnswers = () => parts.secretAnswerListener?.start() ?? Promise.resolve();
  const stopSecretAnswers = () => parts.secretAnswerListener?.stop() ?? Promise.resolve();
  return { ...identity, supervisor, registry, runtimes, flush: () => parts.handlers.flush(), idle, startSecretAnswers, stopSecretAnswers, run: (signal: AbortSignal) => runWorker({ supervisor, registry, signal, log, settle: idle, startSecretAnswers, stopSecretAnswers, catalog: parts.catalog }) };
}

async function runWorker(input: { supervisor: SessionSupervisor; registry: SessionHandleRegistry; signal: AbortSignal; log: SessionLog; settle: () => Promise<void>; startSecretAnswers: () => Promise<void>; stopSecretAnswers: () => Promise<void>; catalog: WorkerParts["catalog"] }) {
  const wait = (ms: number, signal: AbortSignal) => sleep(ms, undefined, { signal }).catch(() => undefined);
  await input.supervisor.beat();
  const stopCatalog = await input.catalog.start();
  try {
    await input.startSecretAnswers();
    await runSessionLoop({ tick: () => input.supervisor.tick(), signal: input.signal, wait });
  } finally {
    stopCatalog();
    await input.stopSecretAnswers();
    const closed = await Promise.race([input.registry.abandonAll().then(() => true), sleep(SHUTDOWN_GRACE_MS).then(() => false)]);
    if (!closed) {
      input.log.error("shutdown_timeout", {});
      await killChildProcesses();
    }
    await input.settle();
  }
}

export function createProductionSessionWorker() {
  return createSessionWorker(requireDatabase(), { secretAnswerSql: requireSql() });
}
