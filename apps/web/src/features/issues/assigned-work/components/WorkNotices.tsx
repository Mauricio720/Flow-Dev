import { NOT_STARTED_NOTE, NOT_STARTED_TITLE, SOURCE_CHANGED_NOTE } from "../workCopy";

export function NotStartedNote() {
  return (
    <section aria-label={NOT_STARTED_TITLE} className="space-y-1 rounded-xl border border-dashed border-line px-5 py-4">
      <h2 className="text-[15px] font-semibold">{NOT_STARTED_TITLE}</h2>
      <p className="max-w-[65ch] text-sm text-ink-2">{NOT_STARTED_NOTE}</p>
    </section>
  );
}

export function SourceChangedNotice() {
  return <p role="alert" className="rounded-xl border border-line bg-surface px-5 py-3 text-sm text-ink-2">{SOURCE_CHANGED_NOTE}</p>;
}
