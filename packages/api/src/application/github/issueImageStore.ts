export type IssueImageWrite = { owner: string; name: string; token: string; branch: string; path: string; content: Uint8Array; message: string };

export interface IssueImageStore {
  put(input: IssueImageWrite): Promise<void>;
}
