import { Button } from "@/components/ui/button";
import { PROJECTS_PATH, expiredSessionPath, projectWorkPath, repositoryConnectPath } from "@/lib/navigation/projectRoutes";
import { accessProblem } from "@/lib/tasks/taskFailure";
import type { TaskFailure } from "../contract";
import { failureMessage } from "../taskCopy";

type Props = { projectId: string; failure: TaskFailure; returnPath: string; onRetry: () => void };

const SESSION_NOTE = "Sua sessão expirou. Entre novamente para voltar a este trabalho.";
const REVOKED_NOTE = "Seu acesso a este projeto mudou. O conteúdo deste trabalho foi removido da tela.";
const NOTICE_CLASS = "space-y-3 rounded-xl border border-line bg-surface px-5 py-4 text-sm";

function LinkButton({ href, children }: { href: string; children: string }) {
  return <Button asChild size="sm" variant="outline"><a href={href}>{children}</a></Button>;
}

export function WorkAccessNotice({ projectId, failure, returnPath, onRetry }: Props) {
  const problem = accessProblem(failure);
  if (problem === "session") return <div role="alert" className={NOTICE_CLASS}><p>{SESSION_NOTE}</p><LinkButton href={expiredSessionPath(returnPath)}>Entrar novamente</LinkButton></div>;
  if (problem === "revoked") return <div role="alert" className={NOTICE_CLASS}><p>{REVOKED_NOTE}</p><LinkButton href={PROJECTS_PATH}>Voltar ao catálogo</LinkButton></div>;
  if (problem === "authorization") {
    return (
      <form method="post" action={repositoryConnectPath(returnPath)} role="alert" className={NOTICE_CLASS}>
        <p className="max-w-[65ch] leading-relaxed text-ink-2">{failureMessage(failure)} O conteúdo privado deste trabalho foi removido da tela até você autorizar de novo.</p>
        <Button type="submit" size="sm">Autorizar repositórios no GitHub</Button>
      </form>
    );
  }
  if (failure.code === "NOT_FOUND") return <div role="alert" className={NOTICE_CLASS}><p>{failureMessage(failure)}</p><LinkButton href={projectWorkPath(projectId)}>Voltar ao trabalho atribuído</LinkButton></div>;
  return <div role="alert" className={NOTICE_CLASS}><p>{failureMessage(failure)}</p><Button type="button" size="sm" variant="outline" onClick={onRetry}>Tentar de novo</Button></div>;
}
