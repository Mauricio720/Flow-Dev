import { TRPCError } from "@trpc/server";
import { SoftwareError, type SoftwareErrorReason } from "../application/services/software/softwareErrors";

type Code = "FORBIDDEN" | "CONFLICT" | "BAD_REQUEST" | "PRECONDITION_FAILED" | "SERVICE_UNAVAILABLE";

const CODES: Record<Code, readonly SoftwareErrorReason[]> = {
  FORBIDDEN: ["admin_required", "operation_forbidden"],
  CONFLICT: ["plan_version_changed", "connection_revision_changed", "label_taken", "idempotency_key_reused", "login_in_progress"],
  BAD_REQUEST: ["docs_proxy_required", "docs_proxy_https_required", "max_active_actions_out_of_range", "invalid_input", "label_invalid", "connection_unavailable", "operation_unavailable", "provider_unsupported"],
  PRECONDITION_FAILED: ["operation_not_authenticated", "login_expired"],
  SERVICE_UNAVAILABLE: ["service_unavailable"],
};

const MESSAGES: Partial<Record<SoftwareErrorReason, string>> = {
  admin_required: "Acesso administrativo necessário",
  plan_version_changed: "As configurações mudaram. Atualize para ver o estado mais recente",
  connection_revision_changed: "A conexão mudou. Atualize para ver o estado mais recente",
  label_taken: "Já existe uma conexão com este nome",
  login_in_progress: "Já existe uma autenticação em andamento para esta conexão",
  login_expired: "A autenticação expirou. Inicie novamente",
  service_unavailable: "Não foi possível concluir a operação do Software",
};

const DEFAULT_MESSAGE = "Não foi possível concluir a operação do Software";

function codeFor(reason: SoftwareErrorReason): Code {
  const entry = (Object.entries(CODES) as [Code, readonly SoftwareErrorReason[]][]).find(([, reasons]) => reasons.includes(reason));
  return entry?.[0] ?? "SERVICE_UNAVAILABLE";
}

export function mapSoftwareError(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  const software = error instanceof SoftwareError ? error : new SoftwareError("service_unavailable");
  throw new TRPCError({ code: codeFor(software.reason), message: MESSAGES[software.reason] ?? DEFAULT_MESSAGE, cause: software });
}
