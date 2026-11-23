export interface SessionSettingsWriter {
  write(input: { sessionDir: string; token: string }): Promise<string>;
  remove(sessionId: string): Promise<void>;
}
