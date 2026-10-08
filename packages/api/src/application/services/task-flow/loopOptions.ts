import type { LoopDefinition } from "../../software/compozyControlGateway";
import { offerability } from "./loopPlanValidator";

export const NO_LOOPS = "no_loops";
const LOCAL_UNAVAILABLE = "local_unavailable";
const LOCAL_LOOPS_UNREPORTED = "local_loops_unreported";

export type LoopOption = { name: string; version: string; source: string; description: string; offerable: boolean; reason: string | null; inputs: LoopDefinition["inputs"]; runtimeRoles: string[]; requires: string[] };

export function toLoopOption(definition: LoopDefinition): LoopOption {
  const reason = offerability(definition);
  return { name: definition.name, version: definition.version, source: definition.source, description: definition.description, offerable: reason === null, reason, inputs: definition.inputs, runtimeRoles: definition.runtimeRoles, requires: definition.requires };
}

export function localLoopCatalog(loops: LoopDefinition[] | null) {
  if (!loops) return { loops: [] as LoopOption[], loopsReason: LOCAL_UNAVAILABLE };
  return { loops: loops.map(toLoopOption), loopsReason: loops.length ? null : LOCAL_LOOPS_UNREPORTED };
}
