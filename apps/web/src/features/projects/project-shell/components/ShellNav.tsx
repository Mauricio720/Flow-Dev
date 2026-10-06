import Link from "next/link";
import type { ComponentType } from "react";
import { HomeIcon, IssueIcon, SettingsIcon } from "@/components/icons";
import { projectIssuesPath, projectPath, projectSettingsPath } from "@/lib/navigation/projectRoutes";
import { cn } from "@/lib/utils";

export type ShellSection = "overview" | "issues" | "settings";
type ShellMenu = { section: ShellSection; label: string; icon: ComponentType<{ size?: number }>; path: (projectId: string) => string };
type Props = { projectId: string; section: ShellSection };

export const SHELL_MENUS: ShellMenu[] = [
  { section: "overview", label: "Visão geral", icon: HomeIcon, path: projectPath },
  { section: "issues", label: "Issues", icon: IssueIcon, path: projectIssuesPath },
  { section: "settings", label: "Configurações", icon: SettingsIcon, path: projectSettingsPath },
];

const FOOTER_SECTION: ShellSection = "settings";

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

export function ShellNav({ projectId, section }: Props) {
  const menuLink = (menu: ShellMenu) => <MenuLink key={menu.section} menu={menu} projectId={projectId} active={menu.section === section} />;
  return (
    <nav aria-label="Menus do projeto" className="flex min-h-0 flex-1 flex-col">
      <ul className="flex flex-col gap-0.5">{SHELL_MENUS.filter((menu) => menu.section !== FOOTER_SECTION).map(menuLink)}</ul>
      <ul className="mt-auto flex flex-col gap-0.5 pt-4">{SHELL_MENUS.filter((menu) => menu.section === FOOTER_SECTION).map(menuLink)}</ul>
    </nav>
  );
}
