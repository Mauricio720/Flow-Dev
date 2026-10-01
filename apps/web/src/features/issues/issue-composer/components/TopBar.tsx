import Link from "next/link";
import { BranchIcon, FlowMark, GridIcon, LogOutIcon, MenuIcon } from "@/components/icons";
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
      <button
        type="button"
        onClick={onOpenRail}
        aria-label="Abrir intenções"
        className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-ink/5 lg:hidden"
      >
        <MenuIcon size={18} />
      </button>
      <Link href="/" className="flex items-center gap-2 rounded-md text-[15px] font-semibold tracking-[-0.01em]">
        <FlowMark />
        <span className="hidden sm:inline">Flow Dev</span>
      </Link>
      <span className="hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
      <span className="flex min-w-0 items-center gap-1.5 font-mono text-[13px] text-ink-2">
        <BranchIcon size={14} className="shrink-0" />
        <span className="truncate">{REPO}</span>
      </span>
      <span className="hidden rounded-full border border-line px-2 py-0.5 text-xs text-ink-3 md:inline">dados de demonstração</span>
      {projectId && <Link href="/projects" className="hidden max-w-48 truncate rounded-full border border-lane-project/30 bg-lane-project-wash px-2 py-0.5 text-xs text-lane-project-ink sm:inline">{projectName ?? "Projeto"}</Link>}

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleGrid}
          aria-pressed={grid}
          title="Mostrar a grade do trilho"
          className={`flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm transition-colors ${
            grid ? "bg-ink/[0.07] text-ink" : "text-ink-3 hover:bg-ink/5 hover:text-ink"
          }`}
        >
          <GridIcon />
          <span className="hidden sm:inline">Grade</span>
        </button>
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
        <span className="hidden size-7 place-items-center rounded-full bg-ink text-xs font-semibold text-ground sm:grid" aria-hidden="true">
          V
        </span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm text-ink-3 transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <LogOutIcon />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
