import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type StateProps = { title: string; children: ReactNode; action?: ReactNode; alert?: boolean };

function CatalogState({ title, children, action, alert = false }: StateProps) {
  return (
    <div role={alert ? "alert" : undefined} className="mt-6 rounded-xl border border-line bg-raised px-5 py-8">
      <h2 className="text-[17px] font-semibold">{title}</h2>
      <p className="mt-2 max-w-xl text-[15px] leading-7 text-ink-2">{children}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function CatalogError({ onRetry }: { onRetry: () => void }) {
  return (
    <CatalogState alert title="Não foi possível carregar os projetos" action={<Button type="button" variant="outline" onClick={onRetry}>Tentar novamente</Button>}>
      A lista não respondeu. Isso não significa que você está sem projetos: tente carregar de novo.
    </CatalogState>
  );
}

export function NoAssignments({ onRefresh }: { onRefresh: () => void }) {
  return (
    <CatalogState title="Seu espaço ainda está vazio" action={<Button type="button" variant="outline" onClick={onRefresh}>Atualizar projetos</Button>}>
      Um administrador precisa atribuir um projeto à sua conta. Quando isso acontecer, atualize a lista para continuar.
    </CatalogState>
  );
}

export function NoProjectsYet({ action }: { action?: ReactNode }) {
  return (
    <CatalogState title="Nenhum projeto criado ainda" action={action}>
      Cada projeto nasce de um repositório do GitHub. Depois de criado, atribua o acesso às pessoas do time.
    </CatalogState>
  );
}

export function NoMatches({ search, onClear }: { search: string; onClear: () => void }) {
  return (
    <CatalogState title="Nenhum projeto encontrado" action={<Button type="button" variant="outline" onClick={onClear}>Limpar busca</Button>}>
      Nada corresponde a “{search}” entre os projetos que você pode ver. Confira o nome do projeto ou do repositório.
    </CatalogState>
  );
}
