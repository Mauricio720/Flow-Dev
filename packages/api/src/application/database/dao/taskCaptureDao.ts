export type TaskCapture = { captureId: string; userId: string; sessionId: string; projectId: string; taskId: string | null; expectedVersion: number | null; tokenHash: string; state: "capturing" | "processing"; expiresAt: Date };

export interface TaskCaptureDao {
  start(input: Omit<TaskCapture, "state">): Promise<void>;
  find(input: { userId: string; sessionId: string; captureId: string }): Promise<TaskCapture | null>;
  begin(input: { userId: string; sessionId: string; captureId: string; tokenHash: string }): Promise<TaskCapture | null>;
  complete(input: Pick<TaskCapture, "userId" | "sessionId" | "captureId" | "projectId" | "taskId" | "expectedVersion">): Promise<boolean>;
  release(input: { userId: string; sessionId: string; captureId: string }): Promise<"released" | "missing" | "forbidden">;
}
