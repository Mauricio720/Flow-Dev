import type { CheckoutFileFailure } from "../../terminal/checkoutFileReader";

export const ARTIFACT_FAILURE_MESSAGES: Record<CheckoutFileFailure, string> = {
  too_large: "Maior que 1 MB",
  not_found: "Arquivo não encontrado no clone",
  unreadable: "Não foi possível ler o arquivo",
};
