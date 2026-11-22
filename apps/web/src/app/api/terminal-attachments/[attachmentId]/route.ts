import { attachmentErrorResponse, attachmentFailure, attachmentRemoved, sameOrigin, sessionActor, terminalAttachmentController } from "@/lib/http/terminalAttachmentRoute";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ attachmentId: string }> }) {
  if (!sameOrigin(request)) return attachmentFailure("origin_denied");
  const actor = await sessionActor(request);
  if (!actor) return attachmentFailure("session_required");
  try {
    const { attachmentId } = await params;
    await terminalAttachmentController().remove(actor, attachmentId);
    return attachmentRemoved();
  } catch (error) {
    return attachmentErrorResponse(error);
  }
}
