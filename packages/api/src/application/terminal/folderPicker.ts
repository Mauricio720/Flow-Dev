export type FolderPick = { kind: "picked"; path: string } | { kind: "cancelled" } | { kind: "unavailable" };

export interface FolderPicker {
  pick(startPath: string | null): Promise<FolderPick>;
}
