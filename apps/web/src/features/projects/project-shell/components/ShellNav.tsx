import Link from "next/link";
import type { ComponentType } from "react";
import { BranchIcon, FolderIcon, HomeIcon, IssueIcon, SettingsIcon } from "@/components/icons";
import { projectIssuesPath, projectLocalProjectPath, projectPath, projectSettingsPath, projectWorkPath } from "@/lib/navigation/projectRoutes";
import { cn } from "@/lib/utils";

export type ShellSection = "overview" | "work" | "issues" | "settings" | "local";
type ShellMenu = { section: ShellSection; label: string; icon: ComponentType<{ size?: number }>; path: (projectId: string) => string; adminOnly?: boolean };
type Props = { projectId: string; section: ShellSection; isAdmin: boolean };

export const SHELL_MENUS: ShellMenu[] = [
  { section: "overview", label: "Visão geral", icon: HomeIcon, path: projectPath },
  { section: "work", label: "Trabalho atribuído", icon: BranchIcon, path: projectWorkPath },
  { section: "issues", label: "Issues", icon: IssueIcon, path: projectIssuesPath, adminOnly: true },
  { section: "local", label: "Projeto local", icon: FolderIcon, path: projectLocalProjectPath },
  { section: "settings", label: "Configurações", icon: SettingsIcon, path: projectSettingsPath },
];

const FOOTER_SECTIONS: ShellSection[] = ["local", "settings"];

function MenuLink({ menu, projectId, active }: { menu: ShellMenu; projectId: string; active: boolean }) {
  const Icon = menu.icon;
  return (
    <li>
      <Link href={menu.path(projectId)} aria-current={active ? "page" : undefined} className={cn("flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-ink-2 transition-colors duration-200 ease-out-expo hover:bg-accent hover:text-ink", active && "bg-raised font-medium text-ink ring-1 ring-line hover:bg-raised")}>
        <Icon size={17} />
        {menu.label}
      </Link>
    </li>
  );
}

export function ShellNav({ projectId, section, isAdmin }: Props) {
  const visible = SHELL_MENUS.filter((menu) => isAdmin || !menu.adminOnly);
  const menuLink = (menu: ShellMenu) => <MenuLink key={menu.section} menu={menu} projectId={projectId} active={menu.section === section} />;
  return (
    <nav aria-label="Menus do projeto" className="flex min-h-0 flex-1 flex-col">
      <ul className="flex flex-col gap-0.5">{visible.filter((menu) => !FOOTER_SECTIONS.includes(menu.section)).map(menuLink)}</ul>
      <ul className="mt-auto flex flex-col gap-0.5 pt-4">{visible.filter((menu) => FOOTER_SECTIONS.includes(menu.section)).map(menuLink)}</ul>
    </nav>
  );
}
