import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import type { SpecCommandResult, TaskSpecDao } from "../application/database/dao/taskSpecDao";
import type { SpecAction, SpecStage } from "../application/services/spec/specContracts";
import type { SpecLifecycleService } from "../application/services/spec/specLifecycleService";
import type { SessionPrincipal } from "../context";
import { specEventDto, specEventSummaryDto, specPackageDto, specSnapshotDto } from "./mappers/specDtoMapper";
import { lostProjectAccess, unavailableSpecError } from "./specAccessErrors";
import { logSpecCommand } from "./specEvents";

type Scope = { projectId: string; taskId: string };
type Command = Scope & { requestKey: string; expectedSpecVersion: number };
type AcceptAction = Exclude<SpecAction, "spec.start" | "spec.answer" | "spec.permission">;

export class TaskSpecController {
  constructor(private readonly authorization: WorkAuthorization, private readonly specs: TaskSpecDao, private readonly lifecycle: SpecLifecycleService) {}

  async byTask(actor: SessionPrincipal, input: Scope) {
    await this.requireRead(actor, input);
    const canOperate = await this.authorization.assess({ ...input, actorId: actor.userId }, false).then((assessment) => assessment.reason === null && assessment.contentHash === assessment.source.snapshot.contentHash, () => false);
    return specSnapshotDto(await this.specs.snapshot(input), { actorUserId: actor.userId, canOperate });
  }

  async events(actor: SessionPrincipal, input: Scope & { after?: string; before?: string; latest?: boolean; limit: number }) {
    await this.requireRead(actor, input);
    const page = await this.specs.events({ ...input, cursor: input.after ?? input.before, direction: input.before || input.latest ? "before" : "after" });
    return { ...page, items: page.items.map(specEventSummaryDto) };
  }

  async event(actor: SessionPrincipal, input: Scope & { eventId: string }) {
    await this.requireRead(actor, input);
    return specEventDto(await this.specs.event(input));
  }

  async packages(actor: SessionPrincipal, input: Scope & { cursor?: string; limit: number }) {
    await this.requireRead(actor, input);
    const page = await this.specs.packages(input);
    return { ...page, items: page.items.map(specPackageDto) };
  }

  async package(actor: SessionPrincipal, input: Scope & { packageId: string }) {
    await this.requireRead(actor, input);
    return specPackageDto(await this.specs.package(input));
  }

  async document(actor: SessionPrincipal, input: Scope & { packageId: string; documentId: string; cursor?: string; limit: number }) {
    await this.requireRead(actor, input);
    return this.specs.document(input);
  }

  async submission(actor: SessionPrincipal, input: Scope & { action: SpecAction; requestKey: string }) {
    await this.requireAuthor(actor, input);
    const receipt = await this.lifecycle.submission({ ...input, actorUserId: actor.userId });
    return receipt ? { status: "known" as const, receipt } : { status: "unknown" as const };
  }

  async start(actor: SessionPrincipal, input: Command & { stage: SpecStage }) {
    await this.requireAuthor(actor, input);
    return finish("spec.start", input, await this.lifecycle.start({ ...input, actorUserId: actor.userId }));
  }

  async accept(action: AcceptAction, actor: SessionPrincipal, command: { input: Command & Record<string, unknown>; targets: Parameters<SpecLifecycleService["accept"]>[2] }) {
    const { input, targets } = command;
    await this.requireAuthor(actor, input);
    return finish(action, input, await this.lifecycle.accept(action, { ...input, actorUserId: actor.userId }, targets));
  }

  async answer(actor: SessionPrincipal, input: Command & { attemptId: string; interactionId: string; response: { choiceIndex?: number; text?: string } }) {
    await this.requireAuthor(actor, input);
    return finish("spec.answer", input, await this.lifecycle.answer({ ...input, actorUserId: actor.userId }));
  }

  async permission(actor: SessionPrincipal, input: Command & { attemptId: string; interactionId: string; actionDigest: string; decision: "allow_once" | "deny_once" }) {
    await this.requireAuthor(actor, input);
    return finish("spec.permission", input, await this.lifecycle.permission({ ...input, actorUserId: actor.userId }));
  }

  private async requireRead(actor: SessionPrincipal, scope: Scope) {
    try { await this.authorization.requireRead({ ...scope, actorId: actor.userId }); }
    catch (error) { throw await unavailableSpecError(error, () => this.hadAccess(actor, scope)); }
  }

  private async requireAuthor(actor: SessionPrincipal, scope: Scope) {
    try { await this.authorization.requireOperate({ projectId: scope.projectId, taskId: scope.taskId, actorId: actor.userId }, { currentSource: true }); }
    catch (error) { throw lostProjectAccess(error) ? await unavailableSpecError(error, () => this.hadAccess(actor, scope)) : error; }
  }

  private hadAccess(actor: SessionPrincipal, scope: Scope) {
    return this.specs.hadAccess({ ...scope, actorUserId: actor.userId });
  }
}

function finish(action: SpecAction, input: Command, result: SpecCommandResult) {
  const { replayed, ...receipt } = result;
  logSpecCommand({ event: replayed ? "spec.command_replayed" : "spec.command_accepted", action, input, receipt });
  return receipt;
}
