import type { ConnectionStore, SoftwareDao } from "../../database/dao/softwareDao";
import type { TaskFlowDao } from "../../database/dao/taskFlowDao";
import type { LegacyProjection } from "./legacyProjection";
import type { ConnectionLookup } from "./taskFlowViews";
import { packageView, planView, runView } from "./taskFlowViews";
import { TaskFlowError } from "./taskFlowErrors";

export type RunsInput = { taskId: string; cursor?: string; limit: number };

async function lookup(connections: ConnectionStore, ids: string[]): Promise<ConnectionLookup> {
  const unique = [...new Set(ids)];
  const rows = await Promise.all(unique.map((id) => connections.find(id)));
  return new Map(unique.map((id, index) => [id, rows[index] ?? null]));
}

export class TaskFlowReader {
  constructor(private readonly flow: TaskFlowDao, private readonly software: SoftwareDao, private readonly legacy: LegacyProjection) {}

  async byTask(taskId: string) {
    const kind = await this.flow.flowKind(taskId);
    if (kind === "legacy") return { flow: kind, plan: null, legacy: await this.legacy.read(taskId), activeRunId: null, packages: [] };
    const plan = await this.flow.plans.find(taskId);
    if (!plan) return { flow: kind, plan: null, legacy: null, activeRunId: null, packages: [] };
    const connections = await lookup(this.software.connections, plan.actions.flatMap((action) => action.bindings.map((binding) => binding.connectionId)));
    const active = await this.flow.runs.activeWrite(taskId);
    return { flow: kind, plan: planView(plan, connections), legacy: null, activeRunId: active?.id ?? null, packages: await this.packages(taskId) };
  }

  async packages(taskId: string) {
    const records = await this.flow.packages.list(taskId);
    return Promise.all(records.map(async (record) => packageView(record, await this.flow.packages.files(record.id))));
  }

  async packageDocuments(taskId: string, packageId: string) {
    const record = await this.flow.packages.find(taskId, packageId);
    if (!record) throw new TaskFlowError("package_unavailable");
    const files = await this.flow.packages.files(record.id);
    return { ...packageView(record, files), documents: files.map((file) => ({ path: file.path, role: file.role, sourceText: file.sourceText })) };
  }

  async runs(input: RunsInput) {
    const page = await this.flow.runs.list(input);
    const ids = page.items.flatMap((run) => run.connectionIds);
    const connections = await lookup(this.software.connections, ids);
    return { items: page.items.map((run) => runView(run, connections)), nextCursor: page.nextCursor };
  }
}
