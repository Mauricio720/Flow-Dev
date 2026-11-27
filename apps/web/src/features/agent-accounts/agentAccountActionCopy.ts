export const ACCOUNT_GENERIC_FAILURE = "Não foi possível concluir agora. Tente de novo.";

export const CREATE_HEADING = "Cadastrar conta";
export const CREATE_PROVIDER_LABEL = "Provedor";
export const CREATE_LABEL_FIELD = "Nome da conta";
export const CREATE_LABEL_PLACEHOLDER = "Pessoal, Trabalho…";
export const CREATE_SUBMIT_LABEL = "Cadastrar conta";
export const CREATE_SAVING_LABEL = "Cadastrando…";
export const CREATE_DONE_NOTE = "Conta cadastrada. Rode o comando de login dela no terminal e depois clique em Verificar login.";

export const LOGIN_COMMAND_HINT = "Rode este comando no terminal desta máquina para fazer login nesta conta:";
export const COPY_COMMAND_LABEL = "Copiar comando";
export const COPY_DONE_NOTE = "Comando copiado";
export const COPY_FAILED_NOTE = "Não foi possível copiar. Selecione o comando e copie à mão.";

export const VERIFY_LABEL = "Verificar login";
export const VERIFYING_LABEL = "Verificando…";

export const RENAME_LABEL = "Renomear";
export const RENAME_FIELD_LABEL = "Novo nome";
export const RENAME_SUBMIT_LABEL = "Salvar nome";
export const RENAME_SAVING_LABEL = "Salvando…";
export const CANCEL_LABEL = "Cancelar";

export const REMOVE_LABEL = "Remover";
export const REMOVE_SUBMIT_LABEL = "Remover conta";
export const REMOVING_LABEL = "Removendo…";

export function removeQuestion(label: string) {
  return `Remover a conta ${label}? O login dela é encerrado e o diretório dela é apagado desta máquina. As sessões antigas continuam mostrando o nome, com "(removida)".`;
}
