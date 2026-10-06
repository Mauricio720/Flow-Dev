import type { SpecActorScope, SpecCommandPayload, SpecCommandResult, SpecDispatchAttempt, TaskSpecDao } from "../../database/dao/taskSpecDao";
import type { SpecAction, SpecStage } from "./specContracts";
import { TaskError } from "../tasks/taskErrors";
import { interactionAnswerValue, validateAnswer, validatePermission, type AnswerResponse } from "./specInteractionRules";
import { openAdmission, type SpecAdmission } from "../../spec/specAdmission";
import { specPayloadHash } from "./specPayload";

const QUEUED_STATE = "queued";
const NEW_ATTEMPT_ACTIONS: readonly string[] = ["spec.adjust", "spec.retry"];

type Command = SpecActorScope & { requestKey: string; expectedSpecVersion: number };
type AcceptAction = Exclude<SpecAction, "spec.start" | "spec.answer" | "spec.permission">;
type Targets = Omit<SpecCommandPayload, "payload">;

function commandPayload(input: Command & Record<string, unknown>) {
  const { requestKey, actorUserId, ...payload } = input;
  return payload;
}

export class SpecLifecycleService {
  constructor(private readonly dao: TaskSpecDao, private readonly admission: SpecAdmission = openAdmission) {}

  async start(input: Command & { stage: SpecStage }): Promise<SpecCommandResult> {
    await this.admission.assertReady();
    return this.dao.start({ ...input, payloadHash: specPayloadHash("spec.start", commandPayload(input)) });
  }

  async accept(action: AcceptAction, input: Command & Record<string, unknown>, targets: Targets): Promise<SpecCommandResult> {
    if (NEW_ATTEMPT_ACTIONS.includes(action)) await this.admission.assertReady();
    const payload = commandPayload(input);
    return this.dao.accept({ ...input, ...targets, action, payload, payloadHash: specPayloadHash(action, payload) });
  }

  answer(input: Command & { attemptId: string; interactionId: string; response: AnswerResponse }) {
    const payload = commandPayload(input);
    return this.dao.resolveInteraction({ ...input, action: "spec.answer", payload, payloadHash: specPayloadHash("spec.answer", payload), validate: (interaction) => validateAnswer(interaction, input.response), response: (interaction) => ({ value: interactionAnswerValue(interaction, input.response), ...input.response }) });
  }

  permission(input: Command & { attemptId: string; interactionId: string; actionDigest: string; decision: "allow_once" | "deny_once" }) {
    const payload = commandPayload(input);
    return this.dao.resolveInteraction({ ...input, action: "spec.permission", payload, payloadHash: specPayloadHash("spec.permission", payload), validate: (interaction) => validatePermission(interaction, input), response: () => ({ decision: input.decision, actionDigest: input.actionDigest }) });
  }

  async authorizeDispatch(attemptId: string, entitlement: (attempt: SpecDispatchAttempt) => Promise<boolean>) {
    const attempt = await this.dao.findDispatchAttempt(attemptId);
    if (!attempt) throw new TaskError("spec_unavailable");
    if (attempt.state !== QUEUED_STATE) return { dispatch: false as const, attempt, reason: null };
    if (await entitlement(attempt)) return { dispatch: true as const, attempt, reason: null };
    await this.dao.failQueuedAttempt({ attemptId, reason: "access_revoked" });
    return { dispatch: false as const, attempt, reason: "access_revoked" as const };
  }

  submission(input: SpecActorScope & { action: SpecAction; requestKey: string }) {
    return this.dao.submission(input);
  }
}
