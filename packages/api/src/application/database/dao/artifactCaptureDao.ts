import type { ArtifactCaptureTrigger } from "../../terminal/artifactCaptureTrigger";

export type CaptureSession = { id: string; taskId: string; projectId: string; checkoutPath: string; lastCaptureAt: Date | null; captureFolder: string | null };
export type TouchedFile = { path: string; skill: string; occurredAt: Date };
export type ArtifactKey = { taskId: string; projectId: string; relativePath: string };
export type LatestVersion = { artifactId: string; version: number; sha256: string };

export type NewArtifactVersion = ArtifactKey & {
  skill: string;
  sessionId: string;
  content: string;
  sha256: string;
  byteSize: number;
  trigger: ArtifactCaptureTrigger;
  capturedAt: Date;
};

export interface ArtifactCaptureStore {
  touchedSince(sessionId: string, since: Date | null): Promise<TouchedFile[]>;
  latestVersion(taskId: string, relativePath: string): Promise<LatestVersion | null>;
  appendVersion(input: NewArtifactVersion): Promise<void>;
  recordFailure(input: ArtifactKey & { failure: string }): Promise<void>;
  clearFailure(taskId: string, relativePath: string): Promise<void>;
  markCaptured(sessionId: string, at: Date): Promise<void>;
}

export interface ArtifactCaptureDao {
  withCaptureLock<T>(sessionId: string, work: (session: CaptureSession, store: ArtifactCaptureStore) => Promise<T>): Promise<T | null>;
}
