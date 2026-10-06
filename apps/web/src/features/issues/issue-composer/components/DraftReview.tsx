"use client";

import { Button } from "@/components/ui/button";
import type { DraftEditor } from "../hooks/useDraftEditor";
import { useDraftReview, type ReviewInput } from "../hooks/useDraftReview";
import { proposalFields } from "../refinementModel";
import { DraftFooter } from "./DraftFooter";
import { IssueDraftBlock } from "./IssueDraftBlock";
import { PublicationPreview } from "./PublicationPreview";
import { RefinementReview } from "./RefinementReview";

const DRAFT_HEADING = "Draft da issue";
const STALE_NOTE = "Existe uma revisão mais recente desta tarefa, salva em outra aba. Suas alterações locais não foram substituídas.";

type Props = ReviewInput & { repository: string };

function StaleRevisionNotice({ editor }: { editor: DraftEditor }) {
  return (
    <div role="alert" className="space-y-2 border-t border-line bg-clarify-wash/40 px-5 py-3.5">
      <p className="text-sm text-clarify-ink">{STALE_NOTE}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={editor.discard}>Carregar a revisão mais recente</Button>
        <Button type="button" variant="ghost" size="sm" onClick={editor.keepMine}>Manter minhas alterações</Button>
      </div>
    </div>
  );
}

export function DraftReview({ repository, ...input }: Props) {
  const review = useDraftReview(input);
  const { editor, proposal, publication } = review;
  const { saveState, busy, commandFailure } = input.actions;
  const { revision } = input;
  return (
    <IssueDraftBlock heading={DRAFT_HEADING} repository={repository} published={false} draft={review.draft} sources={review.sources} errors={review.errors} editor={editor}>
      {editor?.stale && <StaleRevisionNotice editor={editor} />}
      {proposal && (
        <RefinementReview key={proposal.operationId} fields={proposalFields(revision.draft, proposal.draft, revision.manuallyEditedPaths)} busy={busy} failure={commandFailure} onApply={(paths) => review.actions.resolve("apply", paths)} onDiscard={() => review.actions.resolve("discard", [])} />
      )}
      <PublicationPreview state={publication.state} preview={review.preview} onRetry={review.actions.review} />
      <DraftFooter block={review.block} saveState={saveState} editing={editor?.editing ?? false} dirty={editor?.dirty ?? false} reviewing={publication.state.status === "loading"} onToggleEditing={() => editor?.setEditing(!editor.editing)} onSave={() => void review.actions.save()} onDiscard={() => editor?.discard()} onReview={review.actions.review} onPublish={() => void publication.publish()} />
    </IssueDraftBlock>
  );
}
