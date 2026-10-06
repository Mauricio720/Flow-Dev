import Link from "next/link";
import type { ReactNode } from "react";
import { FlowMark } from "@/components/icons";
import { PROJECTS_PATH } from "@/lib/navigation/projectRoutes";
import { SignOutButton } from "./SignOutButton";

type Props = { children?: ReactNode; actions?: ReactNode };

export function AppHeader({ children, actions }: Props) {
  return (
    <header className="relative flex h-12 shrink-0 items-center gap-3 border-b border-line bg-ground px-3 sm:px-4">
      <Link href={PROJECTS_PATH} aria-label="Flow Dev, catálogo de projetos" className="flex shrink-0 items-center gap-2 rounded-md text-[15px] font-semibold tracking-[-0.01em]">
        <FlowMark />
        <span className="hidden sm:inline">Flow Dev</span>
      </Link>
      {children}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {actions}
        <SignOutButton />
      </div>
    </header>
  );
}
