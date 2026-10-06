import { Button } from "@/components/ui/button";
import { projectSettingsPath, repositoryConnectPath } from "@/lib/navigation/projectRoutes";

export function BoardAuthorization({ projectId }: { projectId: string }) {
  return (
    <form method="post" action={repositoryConnectPath(projectSettingsPath(projectId))} role="alert" className="rounded-xl border border-clarify/40 bg-clarify-wash px-5 py-5">
      <h3 className="text-[15px] font-semibold text-clarify-ink">Autorize o acesso aos quadros</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-ink-2">A autorização atual do GitHub cobre os repositórios, mas não os quadros de projeto. Autorize de novo com a mesma conta e salve o link em seguida.</p>
      <Button type="submit" className="mt-4">Autorizar quadros no GitHub</Button>
    </form>
  );
}
