export interface SessionSettingsRemover {
  remove(sessionId: string): Promise<void>;
}
