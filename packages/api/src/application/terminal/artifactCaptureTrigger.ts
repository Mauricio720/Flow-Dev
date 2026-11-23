export const ARTIFACT_CAPTURE_TRIGGERS = ["stop", "session_end"] as const;

export type ArtifactCaptureTrigger = (typeof ARTIFACT_CAPTURE_TRIGGERS)[number];

export const MAX_ARTIFACT_BYTES = 1_048_576;
