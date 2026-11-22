import type { StagingCleanup } from "./hooks/useStagingCleanup";
import { discardStagedAttachment } from "./hooks/useStagingCleanup";
import type { AttachmentItem } from "./terminalAttachmentModel";
import { UploadError, uploadTerminalAttachment } from "./terminalAttachmentClient";
import type { TerminalScope } from "./terminalContract";

type Update = (localId: string, patch: Partial<AttachmentItem>) => void;
type RunInput = { scope: TerminalScope; item: AttachmentItem; update: Update; staging: StagingCleanup };

export async function runUpload({ scope, item, update, staging }: RunInput) {
  const onProgress = (progress: number) => update(item.localId, { progress });
  try {
    const done = await uploadTerminalAttachment({ ...scope, file: item.file, onProgress });
    if (staging.isAbandoned()) return discardStagedAttachment(done.id);
    update(item.localId, { state: "uploaded", progress: 1, serverId: done.id, contentType: done.contentType });
  } catch (error) {
    const failure = error instanceof UploadError ? error : new UploadError("failed", "");
    update(item.localId, { state: failure.kind, message: failure.message });
  }
}
