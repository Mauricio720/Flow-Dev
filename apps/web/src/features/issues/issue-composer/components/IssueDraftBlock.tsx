"use client";

import { useId, useState } from "react";
import { GitHubMark } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { REPO, type IssueDraft, type ThreadItem } from "../model";
import { RichText } from "./Graph";
import { DraftCriteriaEditor } from "./DraftCriteriaEditor";
import { DraftField } from "./DraftField";
import { DraftFooter } from "./DraftFooter";

type DraftItem = Extract<ThreadItem, { kind: "draft" }>;

type Props = {
  item: DraftItem;
  onChange: (draft: IssueDraft) => void;
  onPublish: () => void;
};

const refVariant = { project: "ref-project", github: "ref-github" } as const;

export function IssueDraftBlock({ item, onChange, onPublish }: Props) {
  const { draft, status } = item;
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const locked = status !== "review";

  const set = <K extends keyof IssueDraft>(key: K, value: IssueDraft[K]) => onChange({ ...draft, [key]: value });

  function finishEditing() {
    if (!draft.title.trim()) return setError("O título não pode ficar vazio.");
    onChange({ ...draft, criteria: draft.criteria.filter((criterion) => criterion.trim()) });
    setError(null);
    setEditing(false);
  }

  function publish() {
    if (!draft.title.trim()) return setError("O título não pode ficar vazio.");
    setEditing(false);
    onPublish();
  }

  return (
    <article
      aria-labelledby={`${id}-heading`}
      className={`overflow-hidden rounded-xl border-2 bg-raised transition-colors duration-500 ${
        status === "published" ? "border-merge" : "border-merge/45"
      }`}
    >
      <header className="flex min-h-[52px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3">
        <h3 id={`${id}-heading`} className="text-[15px] font-semibold">
          {status === "published" ? `Issue #${item.issueNumber}` : "Draft da issue"}
        </h3>
        <span className="flex items-center gap-2 font-mono text-xs text-ink-3">
          <GitHubMark size={13} />
          {REPO}
        </span>
      </header>

      <DraftField label="Título" htmlFor={editing ? `${id}-title` : undefined}>
        {editing ? (
          <Input
            id={`${id}-title`}
            className="font-medium hover:border-ink-3"
            value={draft.title}
            onChange={(event) => set("title", event.target.value)}
          />
        ) : (
          <p className="text-[17px] leading-snug font-semibold text-balance">{draft.title}</p>
        )}
      </DraftField>

      <DraftField label="Contexto" htmlFor={editing ? `${id}-context` : undefined}>
        {editing ? (
          <Textarea
            id={`${id}-context`}
            rows={3}
            className="resize-y hover:border-ink-3"
            value={draft.context}
            onChange={(event) => set("context", event.target.value)}
          />
        ) : (
          <p className="max-w-[65ch] text-[15px] leading-relaxed text-ink-2">
            <RichText text={draft.context} />
          </p>
        )}
      </DraftField>

      <DraftField label="Objetivo" htmlFor={editing ? `${id}-goal` : undefined}>
        {editing ? (
          <Textarea
            id={`${id}-goal`}
            rows={2}
            className="resize-y hover:border-ink-3"
            value={draft.goal}
            onChange={(event) => set("goal", event.target.value)}
          />
        ) : (
          <p className="max-w-[65ch] text-[15px] leading-relaxed text-ink-2">
            <RichText text={draft.goal} />
          </p>
        )}
      </DraftField>

      <DraftField label="Critérios de aceite">
        {editing ? (
          <DraftCriteriaEditor criteria={draft.criteria} onChange={(criteria) => set("criteria", criteria)} />
        ) : (
          <ul className="space-y-1.5">
            {draft.criteria.map((criterion, index) => (
              <li key={index} className="flex gap-3 text-[15px] leading-relaxed text-ink-2">
                <span className="mt-[7px] size-2.5 shrink-0 rounded-[3px] border-[1.5px] border-ink-3" aria-hidden="true" />
                <span>
                  <RichText text={criterion} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </DraftField>

      <DraftField label="Labels" htmlFor={editing ? `${id}-labels` : undefined}>
        {editing ? (
          <Input
            id={`${id}-labels`}
            className="font-mono text-sm hover:border-ink-3"
            value={draft.labels.join(", ")}
            onChange={(event) => set("labels", event.target.value.split(",").map((label) => label.trim()).filter(Boolean))}
          />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {draft.labels.map((label) => (
              <Badge key={label} variant="label">
                {label}
              </Badge>
            ))}
          </div>
        )}
      </DraftField>

      {draft.references.length > 0 && (
        <DraftField label="Referências">
          <div className="flex flex-wrap gap-1.5">
            {draft.references.map((ref) => (
              <Badge key={ref.label} variant={refVariant[ref.source]} className="max-w-full truncate">
                {ref.label}
              </Badge>
            ))}
          </div>
        </DraftField>
      )}

      <DraftFooter
        status={status}
        error={error}
        editing={editing}
        locked={locked}
        onToggleEditing={() => (editing ? finishEditing() : setEditing(true))}
        onPublish={publish}
      />
    </article>
  );
}
