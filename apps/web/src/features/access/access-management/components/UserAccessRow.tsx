import { Button } from "@/components/ui/button";

type User = { id: string; githubLogin: string; displayName?: string; avatarUrl?: string };

type Props = {
  user: User;
  disabled: boolean;
  onChangeAccess: (userId: string, action: "assign" | "remove") => void;
};

export function UserAccessRow({ user, disabled, onChangeAccess }: Props) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <span>
        <span className="block font-medium">{user.displayName || user.githubLogin}</span>
        <span className="font-mono text-xs text-ink-3">@{user.githubLogin}</span>
      </span>
      <span className="flex gap-2">
        <Button type="button" size="sm" disabled={disabled} onClick={() => onChangeAccess(user.id, "assign")}>
          Atribuir
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => onChangeAccess(user.id, "remove")}
        >
          Remover
        </Button>
      </span>
    </li>
  );
}
