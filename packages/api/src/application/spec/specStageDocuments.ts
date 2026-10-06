import type { SpecStage } from "../services/spec/specContracts";

const REQUIRED: Record<SpecStage, readonly string[]> = {
  prd: ["_prd.md", "_user_stories.md"],
  tech_spec: ["_techspec.md", "_tests.md"],
  tasks: ["_tasks.md"],
};
const TASK_FILE = /^task_\d{2,3}\.md$/;
const ADR_FILE = /^adrs\/adr-\d{3,}\.md$/;
const INDEX_FILE = /^\.flow-spec-(prd|tech_spec|tasks)\.json$/;

export function indexPath(stage: SpecStage) {
  return `.flow-spec-${stage}.json`;
}

export function requiredDocuments(stage: SpecStage) {
  return [...REQUIRED[stage], indexPath(stage)];
}

export function documentRole(path: string) {
  if (INDEX_FILE.test(path)) return "index";
  if (ADR_FILE.test(path)) return "adr";
  if (TASK_FILE.test(path)) return "task";
  return path.replace(/^_/, "").replace(/\.md$/, "");
}

export function missingDocuments(stage: SpecStage, paths: readonly string[]) {
  const missing = requiredDocuments(stage).filter((required) => !paths.includes(required));
  if (stage === "tasks" && !paths.some((path) => TASK_FILE.test(path))) missing.push("task_NN.md");
  return missing;
}
