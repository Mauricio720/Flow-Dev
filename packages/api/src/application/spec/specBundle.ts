import { z } from "zod";
import { sha256Hex } from "../services/spec/specPayload";
import { TaskError } from "../services/tasks/taskErrors";
import { COMPOZY_PIN, MANAGED_PERMISSION_MODE, SPEC_BUNDLE_SKILLS } from "./specPins";
import { requiredDocuments } from "./specStageDocuments";

const FORBIDDEN_UNIFIED_OUTPUT = "_spec.md";
const TASK_FILE_PATTERN = "task_NN.md";
const skillSchema = z.object({
  stage: z.enum(["prd", "tech_spec", "tasks"]),
  requires: z.array(z.string()),
  allowsWithoutPrd: z.boolean().optional(),
  acceptsRetainedContext: z.array(z.string()),
  outputs: z.array(z.string()),
  optionalOutputs: z.array(z.string()),
  forbiddenOutputs: z.array(z.string()),
  stopsAtStage: z.boolean(),
});
export const bundleSchema = z.object({ bundleVersion: z.string(), schemaVersion: z.literal(1), runtime: z.object({ release: z.string(), permissionMode: z.string() }), skills: z.record(z.string(), skillSchema) });
export type SpecBundle = z.infer<typeof bundleSchema>;

const incompatible = () => new TaskError("runtime_incompatible");

export function validateBundleContract(value: unknown): SpecBundle {
  const parsed = bundleSchema.safeParse(value);
  if (!parsed.success) throw incompatible();
  const bundle = parsed.data;
  if (bundle.runtime.release !== COMPOZY_PIN.release || bundle.runtime.permissionMode !== MANAGED_PERMISSION_MODE) throw incompatible();
  if (Object.keys(bundle.skills).sort().join() !== [...SPEC_BUNDLE_SKILLS].sort().join()) throw incompatible();
  for (const skill of Object.values(bundle.skills)) assertSkill(skill);
  const { "flow-spec-techspec": techspec, "flow-spec-tasks": tasks } = bundle.skills;
  if (!techspec?.allowsWithoutPrd || techspec.requires.includes("prd")) throw incompatible();
  if (!tasks?.requires.includes("tech_spec")) throw incompatible();
  return bundle;
}

function assertSkill(skill: z.infer<typeof skillSchema>) {
  if (skill.outputs.includes(FORBIDDEN_UNIFIED_OUTPUT) || skill.optionalOutputs.includes(FORBIDDEN_UNIFIED_OUTPUT)) throw incompatible();
  if (!skill.forbiddenOutputs.includes(FORBIDDEN_UNIFIED_OUTPUT) || !skill.stopsAtStage) throw incompatible();
  const expected = requiredDocuments(skill.stage);
  const declared = skill.outputs.filter((path) => path !== TASK_FILE_PATTERN);
  if ([...expected].sort().join() !== [...declared].sort().join()) throw incompatible();
  if (skill.stage === "tasks" && !skill.outputs.includes(TASK_FILE_PATTERN)) throw incompatible();
}

export function computeBundleDigest(files: { path: string; content: Buffer | string }[]) {
  const entries = files.map((file) => `${file.path}\0${sha256Hex(file.content)}`).sort();
  return sha256Hex(entries.join("\n"));
}
