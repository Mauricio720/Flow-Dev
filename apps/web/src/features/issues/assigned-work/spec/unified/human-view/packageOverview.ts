import { TASKS_FORMAT } from "../flowStages";
import type { OpenPoint } from "../openPoints";
import type { ReaderTab } from "../packageReader";
import type { FlowPackage } from "../unifiedContract";
import { artifactView } from "./artifactView";
import type { TasksOverview } from "./overviewTypes";
import { tasksOverview } from "./taskOverview";
import type { ArtifactView } from "./viewTypes";

export type PackageProjection = { kind: "spec"; view: ArtifactView } | { kind: "tasks"; overview: TasksOverview };

export function packageProjection(item: FlowPackage, tabs: ReaderTab[], points: OpenPoint[]): PackageProjection | null {
  if (tabs.length === 0) return null;
  if (item.format === TASKS_FORMAT) return { kind: "tasks", overview: tasksOverview(tabs) };
  return { kind: "spec", view: artifactView({ artifact: { artifactId: item.id, artifactVersion: item.version, format: item.format }, tabs, points }) };
}
