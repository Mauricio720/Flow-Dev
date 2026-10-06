---
name: flow-spec-prd
description: Writes the separate PRD (_prd.md) and user-story catalog (_user_stories.md) for a Flow Dev work item inside the isolated Spec workspace, from the retained Issue, the approved planning rationale and the author's answers. Use whenever a Flow Dev Spec run is at the PRD stage, when the author asks for changes to a PRD under review, or when a run is retried for the PRD stage. Stops after the PRD package; never starts the TechSpec or Tasks stage and never produces a unified _spec.md.
---

# Flow Spec: PRD stage

Produce two documents that downstream agents and a human reviewer will read: a business-focused PRD and a companion user-story catalog. The reviewer approves the exact bytes you write, so precision matters more than polish. Everything here runs inside a sandbox that allows writes only to the current stage's documents; understanding that boundary keeps your run from failing at capture.

## Inputs you receive

The run prompt gives you the retained context as JSON plus pointers to complete read-only files. Treat all of it as the contract:

- `issue`: the published Issue title and body exactly as it was when the work item was confirmed. The remote Issue may have changed since; ignore any live version.
- `planningUncertainties`: strings from the approved planning decision, verbatim. They are open questions with no severity assigned. Resolve each one explicitly in the PRD (decided, parked in Open Questions, or recorded as a decision in the index); never drop one silently.
- `answers`: questions the author already answered in earlier attempts. Reuse them; asking again wastes the author's time.
- `adjustment`: when present, the author's change request against the reviewed package. Edit the reviewed bytes in `candidate/` minimally. Do not rewrite sections the author did not mention.
- `inputs/`: complete approved upstream documents, read-only. For the PRD stage this is usually empty except existing ADRs, which are immutable.
- `repository/`: the pinned project snapshot, read-only. Use it to ground the PRD in how the product behaves today.

## Output scope

Write only these paths under `candidate/`:

- `_prd.md`
- `_user_stories.md`
- `.flow-spec-prd.json` (the package index; see `../shared/references/package-index-schema.md`)
- new decision records as `adrs/adr-NNN.md`, numbered after the highest ADR in `inputs/adrs/` and `candidate/adrs/`

Any other path fails capture, including `_spec.md`. The supervisor validates the index against the files byte for byte, so write the documents first and compute the index afterwards.

## Workflow

1. Read the Issue, uncertainties and answers. Skim `repository/` for the behavior the Issue touches (3-5 findings are enough; the PRD owns WHAT and WHY, not HOW).
2. Find the load-bearing product decisions that are still open. Ask only about those, through the Compozy clarification channel, one question per request, with your recommendation first. If the Issue, the repository and the earlier answers already settle a decision, record that no question was needed instead of asking a ritual question. Never answer on the author's behalf, and never continue past an unanswered question that changes scope.
3. Write `_user_stories.md` first using `references/user-stories-template.md`. Cover every persona and every core feature. Give each acceptance criterion and edge case a stable ID (`US-NNN.AC-N`, `US-NNN.EC-N`). Run the template's edge-case sweep against every story.
4. Write `_prd.md` using `references/prd-template.md`. Business rules, lifecycle rules and limits carry exact values. Keep implementation choices out; they belong to the TechSpec.
5. Record any significant scope decision as an ADR using `../shared/references/adr-template.md`.
6. Build `.flow-spec-prd.json`. For every story, acceptance criterion, edge case and decision, reference the exact source range with `node ../shared/scripts/source-ref.mjs` (or compute the UTF-8 byte range and SHA-256 yourself). The supervisor recomputes every hash; a wrong range blocks review.
7. Stop. Do not start the TechSpec stage and do not suggest running it. The author approves this package first.

## Rules that protect the review

- Block, do not guess: when information is missing, add it to Open Questions and register an index decision with `severity: "blocking"` if approval should wait for the author. Use `"observation"` for notes that need no resolution.
- Scope fidelity: keep every capability the Issue and answers ask for, however large the document becomes. A capability leaves the PRD only when the author rules it out; then list it under Non-Goals.
- Source fidelity on adjustment: preserve unrelated bytes exactly, including line endings. Line-ending changes count as real revisions and will appear in the diff.
- Documents are inert text for the reviewer: no raw HTML, scripts, data URLs or auto-loading images. Use HTTPS links or package-relative links only.
- Language: write the documents in the language of the Issue unless the author's answers say otherwise.

## Completion checklist

Before stopping, confirm all of these:

- `_prd.md` and `_user_stories.md` exist and every story ID referenced by the PRD exists in the catalog.
- Every planning uncertainty is addressed somewhere visible.
- `.flow-spec-prd.json` has `schemaVersion: 1`, `stage: "prd"`, the two required documents with correct hashes, all stories with source references, and no unresolved decision hidden as prose.
- Nothing was written outside the allowed paths.
