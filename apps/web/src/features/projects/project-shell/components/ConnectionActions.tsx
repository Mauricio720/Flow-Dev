import { Button } from "@/components/ui/button";
import { projectPath, repositoryConnectPath } from "@/lib/navigation/projectRoutes";
import type { ConnectionKind } from "@/lib/projects/contract";

const AUTHORIZABLE: ConnectionKind = "authorization_needed";
const RECHECKABLE: ConnectionKind[] = ["temporarily_unavailable", "access_denied_or_missing", "unverified"];

export function hasConnectionAction(kind: ConnectionKind) {
  return kind === AUTHORIZABLE || RECHECKABLE.includes(kind);
}

type Props = { projectId: string; kind: ConnectionKind; onRecheck: () => void };

export function ConnectionActions({ projectId, kind, onRecheck }: Props) {
  if (kind === AUTHORIZABLE) {
    return (
      <form method="post" action={repositoryConnectPath(projectPath(projectId))} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <Button type="submit" className="w-fit">Autorizar repositórios no GitHub</Button>
        <p className="max-w-xl text-xs leading-5 text-ink-3">Se o repositório pertence a uma organização, ela pode exigir a aprovação do aplicativo antes de liberar o acesso.</p>
      </form>
    );
  }
  if (!RECHECKABLE.includes(kind)) return null;
  return <Button type="button" variant="outline" className="w-fit" onClick={onRecheck}>Verificar novamente</Button>;
}
