import { isTaskId } from "@/lib/navigation/projectRoutes";
import type { SpecSelection } from "./specContract";

type Params = Record<string, string | string[] | undefined>;
const STAGES = ["prd", "tech_spec", "tasks"] as const;
export const EMPTY_SELECTION: SpecSelection = { stage: null, packageId: null, documentId: null };

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

export function decodeSpecSelection(params: Params): SpecSelection {
  const stage = single(params.specStage);
  const pkg = single(params.specPackage);
  const document = single(params.specDocument);
  return {
    stage: STAGES.find((item) => item === stage) ?? null,
    packageId: pkg && isTaskId(pkg) ? pkg : null,
    documentId: document && isTaskId(document) ? document : null,
  };
}
