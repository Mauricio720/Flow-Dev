import { Button } from "@/components/ui/button";

type User = { id: string; githubLogin: string; displayName?: string; assignmentCount: number };

type Props = {
  user: User;
  selectedProjectId: string;
  assignedProjectIds: string[];
  onChangeAccess: (userId: string, action: "assign" | "remove") => void;
};

export function UserAccessRow({ user, selectedProjectId, assignedProjectIds, onChangeAccess }: Props) {
  const hasSelectedProject = selectedProjectId !== "" && assignedProjectIds.includes(selectedProjectId);
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <span>
        <span className="block font-medium">{user.displayName || user.githubLogin}</span>
        <span className="font-mono text-xs text-ink-3">@{user.githubLogin} · {user.assignmentCount} projetos</span>
      </span>
      <span className="flex gap-2">
        <Button type="button" size="sm" onClick={() => onChangeAccess(user.id, "assign")}>Atribuir</Button>
        <Button type="button" variant="secondary" size="sm" disabled={!hasSelectedProject} onClick={() => onChangeAccess(user.id, "remove")}>Remover</Button>
      </span>
    </li>
  );
}
