import type { TaskDao } from "../application/database/dao/taskDao";
import type { SpecCommandResult, TaskSpecDao } from "../application/database/dao/taskSpecDao";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { ProjectUnavailableError } from "../application/services/access/projectAccessService";
import type { SpecAction, SpecStage } from "../application/services/spec/specContracts";
import type { SpecLifecycleService } from "../application/services/spec/specLifecycleService";
import { TaskError } from "../application/services/tasks/taskErrors";
import type { SessionPrincipal } from "../context";
import { specEventDto, specEventSummaryDto, specPackageDto, specSnapshotDto } from "./mappers/specDtoMapper";
import { logSpecCommand } from "./specEvents";

type Scope = { projectId: string; taskId: string };
type Command = Scope & { requestKey: string; expectedSpecVersion: number };
type AcceptAction = Exclude<SpecAction, "spec.start" | "spec.answer" | "spec.permission">;

export class TaskSpecController {
  constructor(private readonly tasks: TaskDao, private readonly specs: TaskSpecDao, private readonly lifecycle: SpecLifecycleService, private readonly repositories: RepositoryAccessService) {}

  async byTask(actor: SessionPrincipal, input: Scope) {
    await this.requireRead(actor, input);
    return specSnapshotDto(await this.specs.snapshot(input), actor.userId);
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
    try { await this.repositories.requirePersonalRead(actor, scope.projectId); }
    catch (error) {
      if (!(error instanceof ProjectUnavailableError)) throw error;
      throw new TaskError(await this.specs.hadAccess({ ...scope, actorUserId: actor.userId }) ? "access_revoked" : "spec_unavailable");
    }
  }

  private async requireAuthor(actor: SessionPrincipal, scope: Scope) {
    await this.requireRead(actor, scope);
    const task = await this.tasks.findScoped(scope.projectId, scope.taskId);
    if (!task) throw new TaskError("spec_unavailable");
    if (task.authorUserId !== actor.userId) throw new TaskError("author_required");
  }
}

function finish(action: SpecAction, input: Command, result: SpecCommandResult) {
  const { replayed, ...receipt } = result;
  logSpecCommand({ event: replayed ? "spec.command_replayed" : "spec.command_accepted", action, input, receipt });
  return receipt;
}
