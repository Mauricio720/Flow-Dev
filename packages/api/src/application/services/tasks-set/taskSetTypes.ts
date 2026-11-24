export type TaskStatus = "pending" | "in_progress" | "completed" | "unknown";

export type ManifestNode = { id: string; file: string };
export type ManifestEdge = { from: string; to: string };

export type TaskSetTask = {
  id: string;
  number: string;
  title: string | null;
  type: string | null;
  complexity: string | null;
  dependsOn: string[];
  status: TaskStatus;
  miniDone: number;
  miniTotal: number;
  artifactId: string | null;
  path: string | null;
};

export type TaskSet = {
  folder: string;
  manifestArtifactId: string;
  manifestVersion: number;
  problem: string | null;
  otherFolders: string[];
  tasks: TaskSetTask[];
};

export type SpecRef = { artifactId: string; path: string; updatedAt: string };
