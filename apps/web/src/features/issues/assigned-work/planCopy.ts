export const PLAN_HEADING = "Plano de execução";
export const PLAN_LIST_LABEL = "Sessões do plano";
export const SHORTCUTS_LABEL = "Atalhos do plano";
export const SHORTCUT_ALL_IN_ONE = "Todas numa sessão";
export const SHORTCUT_ONE_PER_TASK = "Uma sessão por tarefa";
export const SHORTCUT_SAME_MODEL = "Mesmo modelo para todas";
export const APPLY_LABEL = "Aplicar";
export const SAVE_LABEL = "Salvar";
export const SAVING_LABEL = "Salvando…";
export const RELOAD_LABEL = "Recarregar o plano";
export const SESSION_SELECT_LABEL = "Sessão";
export const NO_SESSION_LABEL = "Sem sessão";
export const NEW_SESSION_LABEL = "Nova sessão";
export const UNASSIGNED_HEADING = "Sem sessão";
export const STALE_NOTICE = "As tarefas mudaram desde que o plano foi salvo. Revise o plano.";
export const PLAN_LOAD_FAILED = "Não foi possível carregar o plano agora. Tentaremos de novo.";
export const PLAN_SAVE_FAILED = "Não foi possível salvar o plano agora. Tente de novo.";
export const STARTED_NOTE = "iniciada";
export const BUILD_PLAN_LABEL = "Montar";
export const UNSAVED_NOTE = "Alterações não salvas";
export const sessionCountText = (count: number) => `${count} ${count === 1 ? "sessão" : "sessões"}`;

export const sessionTitle = (position: number) => `Sessão ${position}`;
export const taskSelectLabel = (number: string) => `Sessão da tarefa ${number}`;

export const START_LABEL = "Iniciar";
export const START_ANYWAY_LABEL = "Iniciar mesmo assim";
export const START_AGAIN_LABEL = "Iniciar de novo";
export const CONVERSATION_LABEL = "Ver a conversa";
export const READY_STATE = "Pronta";
export const RUNNING_STATE = "Em execução";
export const DONE_STATE = "Concluída";

export const forceConfirmText = (numbers: string[]) => `A sessão depende de tarefas não concluídas: ${numbers.join(", ")}. Iniciar mesmo assim?`;
export const forcedNoteText = (by: string, time: string) => `Iniciada com dependências abertas por ${by} às ${time}`;
export const unfinishedText = (count: number) => `${count} ${count === 1 ? "tarefa não concluída" : "tarefas não concluídas"}`;
export const blockedStateText = (waiting: string[]) => `Bloqueada: aguardando ${waiting.join(", ")}`;
export const endedStateText = (unfinished: string) => `Encerrada · ${unfinished}`;

const ROOT_FOLDER_NAME = "a raiz do repositório";
const folderName = (folder: string) => (folder === "" ? ROOT_FOLDER_NAME : folder);

export const folderChangeText = (from: string, to: string) => `O plano foi montado para as tarefas de ${folderName(from)}, mas o conjunto de tarefas ativo agora está em ${folderName(to)}. As sessões já iniciadas continuam no histórico, mas saem do plano.`;
export const adoptFolderLabel = (to: string) => `Usar as tarefas de ${folderName(to)}`;
