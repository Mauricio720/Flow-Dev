import { DEFAULT_RUNTIME_ROLE, type ListLoopRunsInput, type LoopDefinition, type LoopInputDefault, type LoopRunRef, type LoopRunStatus, type StartLoopInput } from "../../../application/software/compozyControlGateway";
import { controlOk, type ControlResult } from "../../../application/software/controlErrors";
import { loopCancelSchema, loopInspectSchema, loopListSchema, loopRunListSchema, loopRunSchema, type LoopInputRow, type LoopRunRow } from "./compozyControlSchemas2";
import type { ControlCaller } from "./controlCaller";
import { loopDiagnosticsSchema, readLoopDiagnostics } from "./loopRunDiagnostics";

const RUNTIME_INPUT_KIND = "runtime";
const WORKTREE_MODE = "worktree";
const CONFLICT_STATUS = 409;
const UNPROCESSABLE_STATUS = 422;
const START_OVERRIDES = { [CONFLICT_STATUS]: "conflict", [UNPROCESSABLE_STATUS]: "loop_version_changed" } as const;

type DefinitionSource = { name: string; version: number; source: string; description: string; inputs: Record<string, LoopInputRow> };

const SHOWN_DEFAULT_TYPES = ["string", "number", "boolean"];

function shownDefault(value: unknown): LoopInputDefault {
  return SHOWN_DEFAULT_TYPES.includes(typeof value) ? (value as LoopInputDefault) : null;
}

export function toDefinition(row: DefinitionSource): LoopDefinition {
  const entries = Object.entries(row.inputs);
  const plain = entries.filter(([, input]) => input.type !== RUNTIME_INPUT_KIND);
  const declaredRoles = entries.filter(([, input]) => input.type === RUNTIME_INPUT_KIND).map(([name]) => name);
  return {
    name: row.name, version: String(row.version), source: row.source, enabled: true, description: row.description,
    inputs: plain.map(([name, input]) => ({ name, kind: input.type, required: input.required, hasDefault: input.default !== undefined, enumValues: input.enum ?? null, defaultValue: shownDefault(input.default) })),
    runtimeRoles: declaredRoles.length ? declaredRoles : [DEFAULT_RUNTIME_ROLE],
    runtimeLocked: false, requires: [],
  };
}

const toRun = (row: LoopRunRow): LoopRunStatus => ({ runId: row.id, state: row.status, terminalReason: null, definitionVersion: row.definition_version ?? null, createdAt: row.created_at, inputs: row.inputs ?? {} });
const loopsPath = (workspaceId: string) => `/api/workspaces/${encodeURIComponent(workspaceId)}/loops`;
const runPath = (ref: LoopRunRef) => `/api/workspaces/${encodeURIComponent(ref.workspaceId)}/loop-runs/${encodeURIComponent(ref.runId)}`;

function configOverrides(input: StartLoopInput) {
  const environment = input.worktreeId ? { environment: { mode: WORKTREE_MODE, worktree_ref: input.worktreeId } } : {};
  const runtime = input.workerRuntime ? { runtime_defaults: { [DEFAULT_RUNTIME_ROLE]: input.workerRuntime } } : {};
  const overrides = { ...environment, ...runtime };
  return Object.keys(overrides).length ? { config_overrides: overrides } : {};
}

export class CompozyLoops {
  constructor(private readonly caller: ControlCaller) {}

  async list(workspaceId: string): Promise<ControlResult<LoopDefinition[]>> {
    const listed = await this.caller.guarded({ method: "GET", path: loopsPath(workspaceId) }, loopListSchema, (body) => body.loops.map((loop) => loop.name));
    if (!listed.ok) return listed;
    const definitions: LoopDefinition[] = [];
    for (const name of listed.value) {
      const inspected = await this.inspect(workspaceId, name);
      if (inspected.ok) definitions.push(inspected.value);
    }
    return controlOk(definitions, listed.release);
  }

  inspect(workspaceId: string, name: string): Promise<ControlResult<LoopDefinition>> {
    const path = `${loopsPath(workspaceId)}/${encodeURIComponent(name)}`;
    return this.caller.guarded({ method: "GET", path }, loopInspectSchema, (body) => toDefinition({ ...body.loop, inputs: body.loop.definition.inputs }));
  }

  start(input: StartLoopInput): Promise<ControlResult<LoopRunStatus>> {
    const path = `${loopsPath(input.workspaceId)}/${encodeURIComponent(input.name)}/run`;
    return this.caller.guarded({ method: "POST", path, body: { inputs: input.inputs, ...configOverrides(input) } }, loopRunSchema, (parsed) => toRun(parsed.run), START_OVERRIDES);
  }

  async get(ref: LoopRunRef): Promise<ControlResult<LoopRunStatus>> {
    const schema = loopRunSchema.extend({ run: loopRunSchema.shape.run.passthrough() }).passthrough();
    const result = await this.caller.guarded({ method: "GET", path: runPath(ref) }, schema, (parsed) => ({ run: parsed.run, diagnostics: loopDiagnosticsSchema.safeParse(parsed) }));
    if (!result.ok) return result;
    const diagnostics = result.value.diagnostics.success ? await readLoopDiagnostics(this.caller, ref, result.value.diagnostics.data) : {};
    return controlOk({ ...toRun(result.value.run), ...diagnostics }, result.release);
  }

  async cancel(ref: LoopRunRef): Promise<ControlResult<LoopRunStatus>> {
    const cancelled = await this.caller.guarded({ method: "POST", path: `${runPath(ref)}/cancel`, body: {} }, loopCancelSchema, (parsed) => parsed.run_id);
    return cancelled.ok ? this.get(ref) : cancelled;
  }

  listRuns(input: ListLoopRunsInput): Promise<ControlResult<LoopRunStatus[]>> {
    const query = new URLSearchParams({ loop: input.name, live: "true", limit: "50" });
    const path = `/api/workspaces/${encodeURIComponent(input.workspaceId)}/loop-runs?${query}`;
    return this.caller.guarded({ method: "GET", path }, loopRunListSchema, (body) => body.runs.map(toRun));
  }
}
