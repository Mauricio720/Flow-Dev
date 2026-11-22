export const ATTACHMENT_TYPE_MESSAGE = "Tipo não aceito. Envie imagens (PNG, JPEG, GIF, WebP), PDF ou arquivos de texto.";
export const ATTACHMENT_TOO_LARGE_MESSAGE = "Arquivo maior que 10 MB.";
export const ATTACHMENT_COUNT_MESSAGE = "Limite de 10 arquivos por abertura.";
export const ATTACHMENT_TOTAL_MESSAGE = "Os anexos passariam de 30 MB.";
export const ATTACHMENT_DUPLICATE_MESSAGE = "Este arquivo já está anexado.";
export const ATTACHMENT_MISSING_MESSAGE = "Anexo indisponível.";

export type AttachmentFailureReason = "attachment_type_rejected" | "attachment_too_large" | "attachment_limit" | "attachment_duplicate" | "attachment_missing";
export type AttachmentLimitKind = "count" | "total_size";

export class TerminalAttachmentError extends Error {
  constructor(readonly reason: AttachmentFailureReason, readonly limitKind?: AttachmentLimitKind) {
    super(reason);
    this.name = "TerminalAttachmentError";
  }
}

export function attachmentFailureMessage(reason: string, limitKind?: AttachmentLimitKind) {
  if (reason === "attachment_type_rejected") return ATTACHMENT_TYPE_MESSAGE;
  if (reason === "attachment_too_large") return ATTACHMENT_TOO_LARGE_MESSAGE;
  if (reason === "attachment_duplicate") return ATTACHMENT_DUPLICATE_MESSAGE;
  if (reason === "attachment_limit") return limitKind === "total_size" ? ATTACHMENT_TOTAL_MESSAGE : ATTACHMENT_COUNT_MESSAGE;
  return reason === "attachment_missing" ? ATTACHMENT_MISSING_MESSAGE : undefined;
}
