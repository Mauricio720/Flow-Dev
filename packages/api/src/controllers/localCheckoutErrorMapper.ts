import { TRPCError } from "@trpc/server";
import { CheckoutValidationError, StaleLocalCheckoutError, type CheckoutValidationDetails } from "../application/services/projects/localCheckoutErrors";
import { mapProjectError } from "./projectsController";

export const CHECKOUT_PATH_INVALID_MESSAGE = "Informe o caminho completo da pasta, começando por /.";
export const CHECKOUT_NOT_GIT_ROOT_MESSAGE = "Esta pasta não é a raiz de um repositório git.";
export const CHECKOUT_CONFLICT_MESSAGE = "O vínculo mudou desde que você abriu a página. Recarregue para ver a versão atual.";
const NO_REMOTES_LABEL = "nenhum";

export function checkoutValidationMessage(error: CheckoutValidationError) {
  const details: CheckoutValidationDetails = error.details;
  if (error.code === "checkout_path_invalid") return CHECKOUT_PATH_INVALID_MESSAGE;
  if (error.code === "checkout_not_found") return `Pasta não encontrada: ${details.path}.`;
  if (error.code === "checkout_not_git_root") return details.root ? `Escolha a raiz do repositório: ${details.root}.` : CHECKOUT_NOT_GIT_ROOT_MESSAGE;
  const remotes = details.remotes?.length ? details.remotes.join(", ") : NO_REMOTES_LABEL;
  return `Esta pasta não é um clone de ${details.repository}. Remotes encontrados: ${remotes}.`;
}

export function mapLocalCheckoutError(error: unknown): never {
  if (error instanceof CheckoutValidationError) throw new TRPCError({ code: "BAD_REQUEST", message: checkoutValidationMessage(error), cause: error });
  if (error instanceof StaleLocalCheckoutError) throw new TRPCError({ code: "CONFLICT", message: CHECKOUT_CONFLICT_MESSAGE, cause: error });
  return mapProjectError(error);
}
