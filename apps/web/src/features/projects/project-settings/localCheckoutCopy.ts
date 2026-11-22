import { formatMoment } from "@/lib/tasks/formatMoment";

export const LOCAL_CHECKOUT_HEADING = "Meu repositório local";
export const LOCAL_CHECKOUT_INTRO = "Informe a pasta do seu clone deste projeto. O Flow Dev abre o Claude Code nela quando você abre a execução no terminal. Só você vê este caminho.";
export const LOCAL_CHECKOUT_FIELD_LABEL = "Pasta do clone";
export const LOCAL_CHECKOUT_PLACEHOLDER = "/home/voce/codigo/projeto";
export const LOCAL_CHECKOUT_SAVE_LABEL = "Salvar pasta";
export const LOCAL_CHECKOUT_SAVING_LABEL = "Salvando…";
export const LOCAL_CHECKOUT_REMOVE_LABEL = "Remover vínculo";
export const LOCAL_CHECKOUT_STATUS_NOTE: Record<string, string | undefined> = { saved: "Pasta salva.", removed: "Vínculo removido." };
export const LOCAL_CHECKOUT_EMPTY_NOTE = "Nenhuma pasta vinculada ainda.";
export const LOCAL_CHECKOUT_GENERIC_MESSAGE = "Não foi possível salvar agora. O vínculo anterior continua o mesmo; tente de novo.";
export const LOCAL_CHECKOUT_REMOVE_FAILED_MESSAGE = "Não foi possível remover o vínculo agora. Tente de novo.";

export function verifiedNote(verifiedAt: string) {
  return `Verificada em ${formatMoment(verifiedAt)}`;
}
