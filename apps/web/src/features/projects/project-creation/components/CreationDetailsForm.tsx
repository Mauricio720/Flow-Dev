import type { FormEvent } from "react";
import { ProjectDetailsFields } from "@/components/projects/ProjectDetailsFields";
import { Button } from "@/components/ui/button";
import type { ProjectCreationForm } from "../hooks/useProjectCreation";
import { CreationOutcome } from "./CreationOutcome";

type Props = { form: ProjectCreationForm; nodeId: string | null };

export function CreationDetailsForm({ form, nodeId }: Props) {
  function submit(event: FormEvent) {
    event.preventDefault();
    if (nodeId) form.submit(nodeId);
  }
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <ProjectDetailsFields values={form.draft} errors={form.fieldErrors} disabled={form.submitting} onChange={form.change} />
      <CreationOutcome failure={form.failure} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!nodeId || form.submitting}>{form.submitting ? "Criando projeto…" : "Criar projeto"}</Button>
        {!nodeId && <p className="text-sm text-ink-3">Escolha e confirme um repositório ainda não vinculado para criar o projeto.</p>}
      </div>
    </form>
  );
}
