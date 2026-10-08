import type { RunActivity, RunRecord } from "../../database/dao/taskFlowDao";
import type { TaskFlowError } from "./taskFlowErrors";

const DIAGNOSTIC_LABELS: Record<string, string> = {
  spec_missing_product_part: "A spec não contém a seção Product.",
  spec_missing_technical_part: "A spec não contém a seção Technical.",
  package_file_count_invalid: "A quantidade de arquivos é inválida ou há caminhos duplicados.",
  package_too_large: "Os arquivos excedem o tamanho total permitido.",
  missing_task_files: "Nenhum arquivo de tarefa foi gerado.",
};
const FILE_LABELS: Record<string, string> = {
  missing_required_file: "Arquivo obrigatório ausente",
  unexpected_file: "Arquivo não permitido neste pacote",
  file_size_invalid: "Arquivo vazio ou acima do tamanho permitido",
};

function diagnosticLabel(diagnostic: string) {
  if (DIAGNOSTIC_LABELS[diagnostic]) return DIAGNOSTIC_LABELS[diagnostic];
  const [code, path] = diagnostic.split(":", 2);
  return FILE_LABELS[code!] && path ? `${FILE_LABELS[code!]}: ${path}.` : "A estrutura dos arquivos gerados é inválida.";
}

export function packageFailureActivity(run: RunRecord, error: TaskFlowError): RunActivity {
  const diagnostics = error.details?.diagnostics ?? [];
  const preview = diagnostics.length ? diagnostics.map(diagnosticLabel).join("\n") : "Os arquivos gerados não atendem ao formato esperado.";
  return { sequence: run.runtimeEventSequence ?? 0, kind: "warning", at: new Date().toISOString(), preview, tool: null, source: "Validação dos arquivos gerados", status: "package_invalid" };
}
