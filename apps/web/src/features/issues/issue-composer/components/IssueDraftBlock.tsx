"use client";

import { useId, useState, type ReactNode } from "react";
import { ArrowUpRightIcon, CheckIcon, GitHubMark, PencilIcon, PlusIcon, XIcon } from "@/components/icons";
import { REPO, type IssueDraft, type ThreadItem } from "../model";
import { RichText } from "./Graph";

type DraftItem = Extract<ThreadItem, { kind: "draft" }>;

type Props = {
  item: DraftItem;
  onChange: (draft: IssueDraft) => void;
  onPublish: () => void;
};

const refInk = { project: "text-project-ink bg-project-wash", github: "text-github-ink bg-github-wash" } as const;

const fieldClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-[15px] leading-relaxed text-ink placeholder:text-ink-3 transition-colors hover:border-ink-3 focus:border-project focus:outline-none";

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 border-t border-line px-5 py-4 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-6">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="pt-0.5 text-sm text-ink-3">
          {label}
        </label>
      ) : (
        <span className="pt-0.5 text-sm text-ink-3">{label}</span>
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function IssueDraftBlock({ item, onChange, onPublish }: Props) {
  const { draft, status } = item;
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const locked = status !== "review";

  const set = <K extends keyof IssueDraft>(key: K, value: IssueDraft[K]) => onChange({ ...draft, [key]: value });

  function finishEditing() {
    if (!draft.title.trim()) return setError("O título não pode ficar vazio.");
    onChange({ ...draft, criteria: draft.criteria.filter((c) => c.trim()) });
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

      <Field label="Título" htmlFor={editing ? `${id}-title` : undefined}>
        {editing ? (
          <input id={`${id}-title`} className={`${fieldClass} font-medium`} value={draft.title} onChange={(e) => set("title", e.target.value)} />
        ) : (
          <p className="text-[17px] leading-snug font-semibold text-balance">{draft.title}</p>
        )}
      </Field>

      <Field label="Contexto" htmlFor={editing ? `${id}-context` : undefined}>
        {editing ? (
          <textarea id={`${id}-context`} rows={3} className={`${fieldClass} resize-y`} value={draft.context} onChange={(e) => set("context", e.target.value)} />
        ) : (
          <p className="max-w-[65ch] text-[15px] leading-relaxed text-ink-2">
            <RichText text={draft.context} />
          </p>
        )}
      </Field>

      <Field label="Objetivo" htmlFor={editing ? `${id}-goal` : undefined}>
        {editing ? (
          <textarea id={`${id}-goal`} rows={2} className={`${fieldClass} resize-y`} value={draft.goal} onChange={(e) => set("goal", e.target.value)} />
        ) : (
          <p className="max-w-[65ch] text-[15px] leading-relaxed text-ink-2">
            <RichText text={draft.goal} />
          </p>
        )}
      </Field>

      <Field label="Critérios de aceite">
        {editing ? (
          <div className="space-y-2">
            {draft.criteria.map((criterion, i) => (
              <div key={i} className="flex gap-2">
                <input
                  aria-label={`Critério ${i + 1}`}
                  className={fieldClass}
                  value={criterion}
                  onChange={(e) => set("criteria", draft.criteria.map((c, j) => (j === i ? e.target.value : c)))}
                />
                <button
                  type="button"
                  aria-label={`Remover critério ${i + 1}`}
                  onClick={() => set("criteria", draft.criteria.filter((_, j) => j !== i))}
                  className="grid size-10 shrink-0 place-items-center rounded-md text-ink-3 transition-colors hover:bg-ink/5 hover:text-ink"
                >
                  <XIcon />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set("criteria", [...draft.criteria, ""])}
              className="flex h-9 items-center gap-2 rounded-md px-2 text-sm text-project-ink transition-colors hover:bg-project-wash"
            >
              <PlusIcon /> Adicionar critério
            </button>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {draft.criteria.map((criterion, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-ink-2">
                <span className="mt-[7px] size-2.5 shrink-0 rounded-[3px] border-[1.5px] border-ink-3" aria-hidden="true" />
                <span>
                  <RichText text={criterion} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Field>

      <Field label="Labels" htmlFor={editing ? `${id}-labels` : undefined}>
        {editing ? (
          <input
            id={`${id}-labels`}
            className={`${fieldClass} font-mono text-sm`}
            value={draft.labels.join(", ")}
            onChange={(e) => set("labels", e.target.value.split(",").map((l) => l.trim()).filter(Boolean))}
          />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {draft.labels.map((label) => (
              <span key={label} className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-ink-2">
                {label}
              </span>
            ))}
          </div>
        )}
      </Field>

      {draft.references.length > 0 && (
        <Field label="Referências">
          <div className="flex flex-wrap gap-1.5">
            {draft.references.map((ref) => (
              <span key={ref.label} className={`max-w-full truncate rounded-md px-2 py-1 font-mono text-xs ${refInk[ref.source]}`}>
                {ref.label}
              </span>
            ))}
          </div>
        </Field>
      )}

      <footer className="flex flex-col gap-3 border-t border-line bg-surface px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        {status === "published" ? (
          <>
            <p className="flex items-center gap-2 text-sm text-merge-ink">
              <CheckIcon />
              Publicada em {REPO}
            </p>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="flex h-9 items-center gap-1.5 self-start rounded-lg px-3 text-sm font-medium text-ink transition-colors hover:bg-ink/5 sm:self-auto"
            >
              Abrir no GitHub <ArrowUpRightIcon size={14} />
            </a>
          </>
        ) : (
          <>
            <p className={`text-sm ${error ? "text-github-ink" : "text-ink-3"}`} role={error ? "alert" : undefined}>
              {error ?? (status === "publishing" ? "Enviando para o GitHub…" : "Nada é publicado até você aprovar.")}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={locked}
                onClick={() => (editing ? finishEditing() : setEditing(true))}
                className="flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-line bg-raised px-4 text-sm font-medium transition-colors hover:border-ink-3 disabled:opacity-50 sm:flex-none"
              >
                {editing ? <CheckIcon /> : <PencilIcon />}
                {editing ? "Concluir edição" : "Editar"}
              </button>
              <button
                type="button"
                disabled={locked}
                aria-busy={status === "publishing"}
                onClick={publish}
                className="flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-merge px-4 text-sm font-semibold text-on-merge shadow-raised transition-[filter,transform] duration-200 hover:brightness-110 active:translate-y-px disabled:cursor-progress sm:flex-none"
              >
                {status === "publishing" ? (
                  <span className="node-running size-2 rounded-full bg-on-merge" aria-hidden="true" />
                ) : (
                  <GitHubMark size={15} />
                )}
                {status === "publishing" ? "Publicando…" : "Criar Issue"}
              </button>
            </div>
          </>
        )}
      </footer>
    </article>
  );
}
