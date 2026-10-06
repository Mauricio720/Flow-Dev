const VISIBILITY_LABELS: Record<string, string> = { public: "Público", private: "Privado", internal: "Interno" };
const UNKNOWN_VISIBILITY = "Visibilidade não informada";

type Repository = { owner: string; name: string; visibility: string; archived: boolean };

export function visibilityLabel(visibility: string | undefined) {
  return VISIBILITY_LABELS[visibility ?? ""] ?? UNKNOWN_VISIBILITY;
}

export function RepositoryFacts({ repository }: { repository: Repository }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      <span className="font-mono text-[13px] [overflow-wrap:anywhere]">{repository.owner}/{repository.name}</span>
      <span className="text-xs text-ink-3">{visibilityLabel(repository.visibility)}{repository.archived ? " · arquivado" : ""}</span>
    </span>
  );
}
