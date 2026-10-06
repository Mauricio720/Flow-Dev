import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DRAFT_FIELD_LABEL, MAX_COLLECTION_ENTRIES, MAX_PRODUCT_CONSIDERATIONS, type DraftErrors } from "../draftModel";
import type { DraftEditor } from "../hooks/useDraftEditor";
import { DraftField } from "./DraftField";
import { DraftListEditor } from "./DraftListEditor";
import { LabelsEditor } from "./LabelsEditor";
import { PriorityPointsEditor } from "./PriorityPointsEditor";
import { ReferencesEditor, RelevantContextEditor } from "./DraftSourceEditor";

const CONSTRAINT_LABEL = "Restrição";
const CONSIDERATION_LABEL = "Consideração de produto";
const TEXT_PATHS = ["context", "objective"] as const;

type Props = { editor: DraftEditor; errors: DraftErrors };

export function DraftEditorFields({ editor, errors }: Props) {
  const id = useId();
  const { draft, change } = editor;
  const describedBy = (path: keyof DraftErrors) => (errors[path] ? `${id}-${path}-error` : undefined);
  return (
    <>
      <DraftField label={DRAFT_FIELD_LABEL.title} htmlFor={`${id}-title`} error={errors.title} errorId={`${id}-title-error`}>
        <Input id={`${id}-title`} className="font-medium hover:border-ink-3" value={draft.title} aria-invalid={Boolean(errors.title)} aria-describedby={describedBy("title")} onChange={(event) => change("title", event.target.value)} />
      </DraftField>
      {TEXT_PATHS.map((path) => (
        <DraftField key={path} label={DRAFT_FIELD_LABEL[path]} htmlFor={`${id}-${path}`} error={errors[path]} errorId={`${id}-${path}-error`}>
          <Textarea id={`${id}-${path}`} rows={3} className="resize-y hover:border-ink-3" value={draft[path]} aria-invalid={Boolean(errors[path])} aria-describedby={describedBy(path)} onChange={(event) => change(path, event.target.value)} />
        </DraftField>
      ))}
      <DraftField label={DRAFT_FIELD_LABEL.constraints}>
        <DraftListEditor itemLabel={CONSTRAINT_LABEL} items={draft.constraints} limit={MAX_COLLECTION_ENTRIES} onChange={(items) => change("constraints", items)} />
      </DraftField>
      <DraftField label={DRAFT_FIELD_LABEL.relevantContext}>
        <RelevantContextEditor entries={draft.relevantContext} onChange={(entries) => change("relevantContext", entries)} />
      </DraftField>
      <DraftField label={DRAFT_FIELD_LABEL.productConsiderations} error={errors.productConsiderations}>
        <DraftListEditor itemLabel={CONSIDERATION_LABEL} items={draft.productConsiderations} limit={MAX_PRODUCT_CONSIDERATIONS} onChange={(items) => change("productConsiderations", items)} />
      </DraftField>
      <DraftField label={DRAFT_FIELD_LABEL.references}>
        <ReferencesEditor references={draft.references} onChange={(references) => change("references", references)} />
      </DraftField>
      <DraftField label={DRAFT_FIELD_LABEL.priorityPoints} error={errors.priorityPoints}>
        <PriorityPointsEditor points={draft.priorityPoints} onChange={(points) => change("priorityPoints", points)} />
      </DraftField>
      <DraftField label={DRAFT_FIELD_LABEL.labels} error={errors.labels}>
        <LabelsEditor labels={draft.labels} onChange={(labels) => change("labels", labels)} />
      </DraftField>
    </>
  );
}
