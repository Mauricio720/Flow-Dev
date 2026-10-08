"use client";

import Link from "next/link";
import { AppHeader } from "@/components/shared/AppHeader";
import { Button } from "@/components/ui/button";
import { useConnectionStates } from "@/hooks/useConnectionStates";
import { PROJECTS_PATH, PROJECT_CREATION_PATH, expiredSessionPath } from "@/lib/navigation/projectRoutes";
import { TRPC_NOT_FOUND, TRPC_UNAUTHORIZED } from "@/lib/projects/contract";
import { useRouter } from "next/navigation";
import type { CatalogLoad, CatalogViewer } from "./catalogState";
import { CatalogNotices } from "./components/CatalogNotices";
import { CatalogResults } from "./components/CatalogResults";
import { CatalogSearch } from "./components/CatalogSearch";
import { useCatalog } from "./hooks/useCatalog";
import { useProjectSelection } from "./hooks/useProjectSelection";

const ACCESS_ADMIN_PATH = "/admin/access";
const SOFTWARE_ADMIN_PATH = "/admin/software/compozy";
const MEMBER_INTRO = "Projetos atribuídos à sua conta. Escolha um para abrir os menus no contexto do repositório dele.";
const ADMIN_INTRO = "Todos os projetos do Flow Dev. Cada um aponta para um único repositório do GitHub.";

function AdminLinks() {
  return (
    <>
      <Button variant="ghost" size="sm" asChild><Link href={ACCESS_ADMIN_PATH}>Acessos</Link></Button>
      <Button variant="ghost" size="sm" asChild><Link href={SOFTWARE_ADMIN_PATH}>Software</Link></Button>
    </>
  );
}

type Props = { initial: CatalogLoad; viewer: CatalogViewer; notice: string | null };

export function ProjectCatalog({ initial, viewer, notice }: Props) {
  const router = useRouter();
  const catalog = useCatalog(initial);
  const selection = useProjectSelection(catalog.reload, viewer.isAdmin);
  const connections = useConnectionStates(catalog.items.map((project) => project.id), (code) => {
    if (code === TRPC_UNAUTHORIZED) return router.replace(expiredSessionPath(PROJECTS_PATH));
    if (code === TRPC_NOT_FOUND) catalog.reload();
  });
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader actions={viewer.isAdmin && <AdminLinks />} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.03em]">Projetos</h1>
            <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink-2">{viewer.isAdmin ? ADMIN_INTRO : MEMBER_INTRO}</p>
          </div>
          {viewer.isAdmin && <Button asChild><Link href={PROJECT_CREATION_PATH}>Criar projeto</Link></Button>}
        </div>
        <CatalogNotices notice={notice} failure={selection.failure} />
        <CatalogSearch value={catalog.term} onChange={catalog.setTerm} />
        <CatalogResults catalog={catalog} viewer={viewer} selection={selection} connectionOf={connections.kindOf} />
      </main>
    </div>
  );
}
