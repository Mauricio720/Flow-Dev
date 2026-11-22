export const MAX_ATTACHMENTS = 10;
const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * 1024;
export const MAX_ATTACHMENTS_TOTAL_BYTES = 30 * MEGABYTE;

export type Reserved = { count: number; bytes: number };
export type LimitBreach = "count" | "total_size";
export type AttachmentItemState = "uploading" | "uploaded" | "failed" | "rejected";
export type AttachmentItem = {
  localId: string;
  name: string;
  byteSize: number;
  state: AttachmentItemState;
  progress: number;
  file: File;
  serverId?: string;
  contentType?: string;
  message?: string;
};

export function newItem(file: File): AttachmentItem {
  return { localId: crypto.randomUUID(), name: file.name, byteSize: file.size, state: "uploading", progress: 0, file };
}

export function rejectedItem(file: File, message: string): AttachmentItem {
  return { ...newItem(file), state: "rejected", message };
}

export function patchItem(items: AttachmentItem[], localId: string, patch: Partial<AttachmentItem>) {
  return items.map((item) => (item.localId === localId ? { ...item, ...patch } : item));
}

export function activeUploadCount(items: AttachmentItem[]) {
  return items.filter((item) => item.state === "uploading" || item.state === "uploaded").length;
}

export function activeUploadBytes(items: AttachmentItem[]) {
  return items.filter((item) => item.state === "uploading" || item.state === "uploaded").reduce((total, item) => total + item.byteSize, 0);
}

export function uploadedIdsOf(items: AttachmentItem[]) {
  return items.flatMap((item) => (item.state === "uploaded" && item.serverId ? [item.serverId] : []));
}

export function limitBreach(fileSize: number, used: Reserved): LimitBreach | null {
  if (used.count >= MAX_ATTACHMENTS) return "count";
  return used.bytes + fileSize > MAX_ATTACHMENTS_TOTAL_BYTES ? "total_size" : null;
}

export function formatBytes(bytes: number) {
  if (bytes >= MEGABYTE) return `${(bytes / MEGABYTE).toFixed(1).replace(".", ",")} MB`;
  if (bytes >= KILOBYTE) return `${Math.round(bytes / KILOBYTE)} KB`;
  return `${bytes} B`;
}
