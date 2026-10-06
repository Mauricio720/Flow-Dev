import { XIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { IssueDraft, SourceReference } from "../contract";
import { sourceKind, sourceLabel } from "../draftSources";

const EMPTY_COLLECTION = "Sem itens.";
const SOURCE_BADGE = { project: "ref-project", github: "ref-github" } as const;
const EDITED_CLAIM_NOTE = "Ao alterar uma afirmação, ela passa a constar como editada pela pessoa autora, sem a verificação da fonte.";

type ContextProps = { entries: IssueDraft["relevantContext"]; onChange: (entries: IssueDraft["relevantContext"]) => void };
type ReferenceProps = { references: SourceReference[]; onChange: (references: SourceReference[]) => void };

function SourceBadge({ source }: { source: SourceReference }) {
  return <Badge variant={SOURCE_BADGE[sourceKind(source)]} className="max-w-full truncate">{sourceLabel(source)}</Badge>;
}

function RemoveButton({ label, onRemove }: { label: string; onRemove: () => void }) {
  return <Button type="button" variant="ghost" size="icon" aria-label={label} onClick={onRemove} className="size-10 shrink-0 rounded-md"><XIcon /></Button>;
}

export function RelevantContextEditor({ entries, onChange }: ContextProps) {
  if (!entries.length) return <p className="text-sm text-ink-3">{EMPTY_COLLECTION}</p>;
  const rewrite = (index: number, statement: string) => onChange(entries.map((entry, position) => (position === index ? { ...entry, statement } : entry)));
  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <div key={index} className="flex gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Textarea aria-label={`Contexto relevante ${index + 1}`} rows={2} className="resize-y hover:border-ink-3" value={entry.statement} onChange={(event) => rewrite(index, event.target.value)} />
            <SourceBadge source={entry.source} />
          </div>
          <RemoveButton label={`Remover contexto relevante ${index + 1}`} onRemove={() => onChange(entries.filter((_, position) => position !== index))} />
        </div>
      ))}
      <p className="text-xs text-ink-3">{EDITED_CLAIM_NOTE}</p>
    </div>
  );
}

export function ReferencesEditor({ references, onChange }: ReferenceProps) {
  if (!references.length) return <p className="text-sm text-ink-3">{EMPTY_COLLECTION}</p>;
  return (
    <ul className="space-y-2">
      {references.map((source, index) => (
        <li key={index} className="flex min-w-0 items-center justify-between gap-2">
          <SourceBadge source={source} />
          <RemoveButton label={`Remover referência ${index + 1}`} onRemove={() => onChange(references.filter((_, position) => position !== index))} />
        </li>
      ))}
    </ul>
  );
}
