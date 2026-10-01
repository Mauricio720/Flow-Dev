import Link from "next/link";
import { BranchIcon, FlowMark, GridIcon, LogOutIcon, MenuIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { REPO } from "../model";
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";

type Props = {
  grid: boolean;
  onToggleGrid: () => void;
  onOpenRail: () => void;
  projectId?: string;
  projectName?: string;
};

export function TopBar({ grid, onToggleGrid, onOpenRail, projectId, projectName }: Props) {
  const router = useRouter();
  async function signOut() { await authClient.signOut(); router.push("/login"); }
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-ground px-3 sm:px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onOpenRail}
        aria-label="Abrir intenções"
        className="text-ink-2 lg:hidden"
      >
        <MenuIcon size={18} />
      </Button>
      <Link href="/" className="flex items-center gap-2 rounded-md text-[15px] font-semibold tracking-[-0.01em]">
        <FlowMark />
        <span className="hidden sm:inline">Flow Dev</span>
      </Link>
      <Separator orientation="vertical" className="hidden h-5 sm:block" />
      <span className="flex min-w-0 items-center gap-1.5 font-mono text-[13px] text-ink-2">
        <BranchIcon size={14} className="shrink-0" />
        <span className="truncate">{REPO}</span>
      </span>
      <Badge variant="outline" className="hidden md:inline-flex">dados de demonstração</Badge>
      {projectId && (
        <Badge variant="project" asChild className="hidden max-w-48 sm:inline-flex">
          <Link href="/projects" className="truncate">{projectName ?? "Projeto"}</Link>
        </Badge>
      )}

      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleGrid}
          aria-pressed={grid}
          title="Mostrar a grade do trilho"
          className={grid ? "bg-ink/[0.07] text-ink" : undefined}
        >
          <GridIcon />
          <span className="hidden sm:inline">Grade</span>
        </Button>
        <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />
        <span className="hidden size-7 place-items-center rounded-full bg-ink text-xs font-semibold text-ground sm:grid" aria-hidden="true">
          V
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={() => void signOut()}>
          <LogOutIcon />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
}
