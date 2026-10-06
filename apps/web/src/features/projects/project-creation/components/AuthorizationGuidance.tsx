import { Button } from "@/components/ui/button";
import { PROJECT_CREATION_PATH, repositoryConnectPath } from "@/lib/navigation/projectRoutes";

export function AuthorizationGuidance() {
  return (
    <form method="post" action={repositoryConnectPath(PROJECT_CREATION_PATH)} className="rounded-xl border border-clarify/40 bg-clarify-wash px-5 py-5">
      <h3 className="text-[15px] font-semibold text-clarify-ink">Autorize o acesso aos repositórios</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-ink-2">
        Entrar no Flow Dev só confirma quem você é. Para listar e verificar repositórios, inclusive privados, o GitHub pede uma autorização separada com a sua conta.
      </p>
      <Button type="submit" className="mt-4">Autorizar repositórios no GitHub</Button>
      <p className="mt-3 max-w-xl text-xs leading-5 text-ink-3">
        Repositórios de uma organização podem exigir que ela aprove o aplicativo. Se a autorização expirou ou foi negada, repita este passo; o nome e a descrição já preenchidos são mantidos.
      </p>
    </form>
  );
}
