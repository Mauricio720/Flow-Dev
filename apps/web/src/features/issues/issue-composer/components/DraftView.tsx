import { TaskLabels } from "@/components/tasks/TaskLabels";
import { Badge } from "@/components/ui/badge";
import type { IssueDraft } from "../contract";
import { DRAFT_FIELD_LABEL, priorityCopy, type DraftErrors } from "../draftModel";
import { VERIFICATION_LABEL, type DraftSource } from "../draftSources";
import { DraftField } from "./DraftField";
import { RichText } from "./Graph";

const EMPTY_COLLECTION = "Sem itens.";
const SOURCE_BADGE = { project: "ref-project", github: "ref-github" } as const;
const CONTEXT_PREFIX = "relevantContext.";

type Props = { draft: IssueDraft; sources: DraftSource[]; errors: DraftErrors };

function Prose({ text }: { text: string }) {
  return <p className="max-w-[65ch] text-[15px] leading-relaxed text-ink-2 [overflow-wrap:anywhere] whitespace-pre-wrap"><RichText text={text} /></p>;
}

function TextList({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-sm text-ink-3">{EMPTY_COLLECTION}</p>;
  return <ul className="list-disc space-y-1.5 pl-5">{items.map((item, index) => <li key={index}><Prose text={item} /></li>)}</ul>;
}

function SourceTag({ source }: { source: DraftSource }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      <Badge variant={SOURCE_BADGE[source.kind]} className="max-w-full truncate">{source.label}</Badge>
      <span className="text-xs text-ink-3">{VERIFICATION_LABEL[source.verification]}</span>
    </span>
  );
}

function SourceList({ sources }: { sources: DraftSource[] }) {
  if (!sources.length) return <p className="text-sm text-ink-3">{EMPTY_COLLECTION}</p>;
  return (
    <ul className="space-y-2.5">
      {sources.map((source) => (
        <li key={source.key} className="min-w-0">
          {source.statement !== null && <Prose text={source.statement} />}
          <SourceTag source={source} />
        </li>
      ))}
    </ul>
  );
}

export function DraftView({ draft, sources, errors }: Props) {
  const context = sources.filter((source) => source.key.startsWith(CONTEXT_PREFIX));
  const references = sources.filter((source) => !source.key.startsWith(CONTEXT_PREFIX));
  return (
    <>
      <DraftField label={DRAFT_FIELD_LABEL.title} error={errors.title}><p className="text-[17px] leading-snug font-semibold text-balance [overflow-wrap:anywhere]">{draft.title}</p></DraftField>
      <DraftField label={DRAFT_FIELD_LABEL.context} error={errors.context}><Prose text={draft.context} /></DraftField>
      <DraftField label={DRAFT_FIELD_LABEL.objective} error={errors.objective}><Prose text={draft.objective} /></DraftField>
      <DraftField label={DRAFT_FIELD_LABEL.constraints}><TextList items={draft.constraints} /></DraftField>
      <DraftField label={DRAFT_FIELD_LABEL.relevantContext}><SourceList sources={context} /></DraftField>
      <DraftField label={DRAFT_FIELD_LABEL.productConsiderations} error={errors.productConsiderations}><TextList items={draft.productConsiderations} /></DraftField>
      <DraftField label={DRAFT_FIELD_LABEL.references}><SourceList sources={references} /></DraftField>
      <DraftField label={DRAFT_FIELD_LABEL.priorityPoints} error={errors.priorityPoints}><p className={draft.priorityPoints === null ? "text-sm text-ink-3" : "text-[15px] text-ink-2 tabular-nums"}>{priorityCopy(draft.priorityPoints)}</p></DraftField>
      <DraftField label={DRAFT_FIELD_LABEL.labels} error={errors.labels}><TaskLabels labels={draft.labels} /></DraftField>
    </>
  );
}
