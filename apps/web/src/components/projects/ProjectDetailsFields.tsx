import { PROJECT_DESCRIPTION_MAX, PROJECT_NAME_MAX } from "@flow-dev/api/schemas/projectFields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectDetailsDraft } from "@/lib/projects/detailsValidation";
import type { ProjectFieldErrors } from "@/lib/projects/projectFailure";

const NAME_ID = "project-name";
const DESCRIPTION_ID = "project-description";

type Props = { values: ProjectDetailsDraft; errors: ProjectFieldErrors; disabled?: boolean; onChange: (values: ProjectDetailsDraft) => void };

function FieldNote({ id, error, used, limit }: { id: string; error?: string; used: number; limit: number }) {
  if (error) return <p id={id} role="alert" className="text-sm text-destructive">{error}</p>;
  return <p id={id} className="text-xs text-ink-3 tabular-nums">{used}/{limit} caracteres</p>;
}

export function ProjectDetailsFields({ values, errors, disabled, onChange }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor={NAME_ID}>Nome do projeto</Label>
        <Input id={NAME_ID} value={values.name} disabled={disabled} autoComplete="off" aria-invalid={!!errors.name} aria-describedby={`${NAME_ID}-note`} onChange={(event) => onChange({ ...values, name: event.target.value })} />
        <FieldNote id={`${NAME_ID}-note`} error={errors.name} used={values.name.trim().length} limit={PROJECT_NAME_MAX} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={DESCRIPTION_ID}>Descrição (opcional)</Label>
        <Textarea id={DESCRIPTION_ID} rows={3} value={values.description} disabled={disabled} aria-invalid={!!errors.description} aria-describedby={`${DESCRIPTION_ID}-note`} onChange={(event) => onChange({ ...values, description: event.target.value })} />
        <FieldNote id={`${DESCRIPTION_ID}-note`} error={errors.description} used={values.description.trim().length} limit={PROJECT_DESCRIPTION_MAX} />
      </div>
    </div>
  );
}
