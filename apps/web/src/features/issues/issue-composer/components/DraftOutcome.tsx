import type { ReactNode } from "react";
import type { TaskDetail, TaskRevision } from "../contract";
import { draftSources } from "../draftSources";
import { IssueDraftBlock } from "./IssueDraftBlock";
import { PublishedResult, UncertainPublication } from "./PublishedResult";

const DRAFT_HEADING = "Draft da issue";
const NO_ERRORS = {};
const PROPOSAL_NOTE = "Há uma proposta de refinamento aguardando a decisão da pessoa autora.";

type Props = { detail: TaskDetail; revision: TaskRevision; repository: string; workHref: string; onCheck: () => void; children?: ReactNode };

export function hasOutcome(detail: TaskDetail) {
  return detail.publication !== null || detail.task.status === "publication_uncertain";
}

export function DraftOutcome({ detail, revision, repository, workHref, onCheck, children }: Props) {
  const { publication } = detail;
  const heading = publication ? `Issue #${publication.issueNumber}` : DRAFT_HEADING;
  const draft = publication ? { ...revision.draft, title: publication.title } : revision.draft;
  return (
    <IssueDraftBlock heading={heading} repository={publication?.repository ?? repository} published={publication !== null} draft={draft} sources={draftSources(revision)} errors={NO_ERRORS} editor={null}>
      {publication && <PublishedResult publication={publication} authorName={detail.task.authorName} workHref={workHref} />}
      {!publication && detail.task.status === "publication_uncertain" && <UncertainPublication repository={repository} onCheck={onCheck} />}
      {!publication && detail.pendingProposal && <p className="border-t border-line px-5 py-3.5 text-sm text-ink-2">{PROPOSAL_NOTE}</p>}
      {children}
    </IssueDraftBlock>
  );
}
