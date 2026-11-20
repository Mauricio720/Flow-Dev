"use client";

import { CompozyBindingForm } from "./CompozyBindingForm";
import { CompozyBindingSummary } from "./CompozyBindingSummary";
import { CompozyHealthLine } from "./CompozyHealthLine";
import { CompozyPendingLoad, CompozySection } from "./CompozySection";
import { useCompozyBinding, type CompozyView } from "./useCompozyBinding";
import { useCompozyBindingEditor } from "./useCompozyBindingEditor";

type Props = { projectId: string; repository: string };
type LoadedProps = Props & { binding: ReturnType<typeof useCompozyBinding>; view: CompozyView };

function LoadedEditor({ projectId, repository, binding, view }: LoadedProps) {
  const editor = useCompozyBindingEditor(projectId, binding, view.binding);
  return (
    <>
      {view.binding && <CompozyBindingSummary binding={view.binding} repository={repository} />}
      <CompozyBindingForm editor={editor} repository={repository} bound={!!view.binding} />
      <CompozyHealthLine compozy={view.compozy} />
    </>
  );
}

export function CompozyBindingEditor({ projectId, repository }: Props) {
  const binding = useCompozyBinding(projectId);
  return (
    <CompozySection>
      {binding.load.kind === "loaded" ? <LoadedEditor projectId={projectId} repository={repository} binding={binding} view={binding.load.view} /> : <CompozyPendingLoad load={binding.load} />}
    </CompozySection>
  );
}
