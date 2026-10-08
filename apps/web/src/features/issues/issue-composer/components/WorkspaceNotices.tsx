import { Button } from "@/components/ui/button";
import { PROJECTS_PATH, expiredSessionPath, repositoryConnectPath } from "@/lib/navigation/projectRoutes";
import type { TaskFailure } from "../contract";
import type { AccessProblem } from "@/lib/tasks/taskFailure";
import { failureMessage } from "../taskCopy";

const SESSION_NOTE = "Sua sessão expirou. Entre novamente para continuar; o que já foi salvo permanece na tarefa.";
const REVOKED_NOTE = "Seu acesso a este projeto mudou. Escolha outro projeto para continuar.";
const AUTHORIZATION_TITLE = "Autorize a leitura do repositório";
const AUTHORIZATION_NOTE = "Entrar no Flow Dev não libera repositórios. Conversas, drafts e fontes das tarefas dependem do seu próprio acesso ao repositório no GitHub. Depois de autorizar, você volta para este mesmo lugar e nada é gerado ou publicado automaticamente.";
const NOTICE_CLASS = "space-y-3 border-b border-line bg-surface px-4 py-3 text-sm";

type AccessProps = { problem: AccessProblem | null; returnPath: string };
type LoadProps = { failure: TaskFailure; onRetry: () => void };

export function AccessNotice({ problem, returnPath }: AccessProps) {
  if (problem === "session") {
    return <div role="alert" className={NOTICE_CLASS}><p>{SESSION_NOTE}</p><Button asChild size="sm"><a href={expiredSessionPath(returnPath)}>Entrar novamente</a></Button></div>;
  }
  if (problem === "revoked") {
    return <div role="alert" className={NOTICE_CLASS}><p>{REVOKED_NOTE}</p><Button asChild size="sm" variant="outline"><a href={PROJECTS_PATH}>Voltar ao catálogo</a></Button></div>;
  }
  if (problem !== "authorization") return null;
  return (
    <form method="post" action={repositoryConnectPath(returnPath)} role="alert" className={NOTICE_CLASS}>
      <h2 className="text-[15px] font-semibold">{AUTHORIZATION_TITLE}</h2>
      <p className="max-w-[65ch] leading-relaxed text-ink-2">{AUTHORIZATION_NOTE}</p>
      <Button type="submit" size="sm">Autorizar repositórios no GitHub</Button>
    </form>
  );
}

export function StageLoading() {
  return <p role="status" className="mx-auto w-full max-w-[768px] px-3 pt-10 text-sm text-ink-3 sm:px-0">Carregando tarefa…</p>;
}

export function StageFailure({ failure, onRetry }: LoadProps) {
  return (
    <div role="alert" className="mx-auto w-full max-w-[768px] space-y-3 px-3 pt-10 sm:px-0">
      <h2 className="text-[17px] font-semibold">Não foi possível abrir esta tarefa</h2>
      <p className="max-w-[65ch] text-[15px] leading-relaxed text-ink-2">{failureMessage(failure)}</p>
      <Button type="button" variant="outline" onClick={onRetry}>Tentar novamente</Button>
    </div>
  );
}
