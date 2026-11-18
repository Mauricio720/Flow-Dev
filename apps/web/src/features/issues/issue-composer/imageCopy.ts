export const IMAGE_COPY = {
  insert: "Inserir imagem",
  hint: "Também dá para colar ou arrastar imagens no campo. Elas vão para a branch flow-dev-assets do repositório quando a Issue for publicada.",
  uploading: "Enviando imagem…",
  inserted: "Imagem inserida no texto.",
};

export const ATTACHMENT_COPY = {
  attach: "Anexar imagem",
  remove: "Remover imagem",
  hint: "As imagens vão para a Issue, na seção Imagens anexadas, quando ela for publicada.",
  sent: "Imagem anexada",
};

const FALLBACK_FAILURE = "Não foi possível enviar a imagem. Tente de novo.";

const FAILURE_COPY: Record<string, string> = {
  unsupported_image_type: "Formato não aceito. Use PNG, JPEG, GIF ou WebP.",
  image_too_large: "A imagem passa de 5 MB. Reduza o tamanho e tente de novo.",
  image_limit: "Esta tarefa já tem o máximo de 30 imagens.",
  message_image_limit: "Cada mensagem aceita até 10 imagens.",
  task_complete: "A Issue já foi publicada e não aceita novas imagens.",
  author_required: "Somente a pessoa autora pode inserir imagens nesta tarefa.",
  session_required: "Entre novamente para inserir imagens.",
};

export function imageFailureCopy(reason: string) {
  return FAILURE_COPY[reason] ?? FALLBACK_FAILURE;
}
