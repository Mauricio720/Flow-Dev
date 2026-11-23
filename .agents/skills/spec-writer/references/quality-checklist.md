# Spec quality checklist

These are unit tests for the spec's text (Spec Kit calls them "unit tests for English"). Each item asks whether the requirements are **written** well: complete, clear, consistent and testable. None of them asks whether an implementation works.

Run every item against the draft, fix what fails, and report the score in the hand-off ("checklist: 22/24; pendente: …"). An item that does not apply counts as passed; note "n/a" for yourself.

## Completeness
1. Does the review summary state what changes, why, the main decisions, risks and verification in 10 lines or fewer?
2. Does every goal in section 3 trace to at least one story, and every story to at least one REQ?
3. Are the permissions for every role touched by the feature stated?
4. Are error, empty and loading behaviors defined for each user-facing flow?
5. If the feature changes an existing system, does section 9 (Comportamento que não muda) list what must keep working?
6. Is the fate of existing data (defaults, backfill, legacy rows) stated whenever the data model changes?
7. Are rollout and rollback described whenever there is a migration, a public contract change or a data format change?

## Clarity
8. Is every functional requirement in EARS form, with one verifiable behavior per ID?
9. Are the words from the vague-words list either absent or backed by a number or a concrete behavior?
10. Do limits, timeouts, sizes and defaults have exact values?
11. Is Part 1 free of technology (no tables, endpoints, frameworks, file names)?

## Consistency
12. Is each domain concept called by the same name everywhere (no "comentário" in one place and "nota" in another)?
13. Do the permissions, states and limits in Part 2 match those in Part 1?
14. Are IDs unique and sequential, with no references to IDs that do not exist?

## Testability and coverage
15. Does every story have Given/When/Then scenarios with concrete data, including at least one failure scenario?
16. Can every REQ, story scenario and edge case (B-xx) be traced to a row of the verification matrix through its "Cobre" column?
17. Is the matrix compact (one row per requirement group or story, typically 8–15 rows), with each row naming its cases in a few words?
18. Does the Definition of Done use the project's real commands?
18a. Does each matrix row name the failure it must catch and the boundary it exercises for real, with expected results taken from the requirements rather than from code (per the project's testing skill)?
18b. Are doubles limited to slow, variable, costly or external dependencies, with a real database used wherever SQL, transactions or constraints are the risk, and with end-to-end tests reserved for the few critical journeys?

## Uncertainty
19. Is every load-bearing unknown either answered or marked `[PRECISA ESCLARECER: …]`, with a suggestion and a matching Q-xx entry?
20. Are the assumptions made without the user's confirmation listed in section 11?

## Scope and simplicity
21. Is every requirement something the user asked for or confirmed, with ideas you added kept in "Sugestões fora do escopo" instead of in the requirements?
22. Do the non-goals list things that could reasonably have been in scope, each with a reason?
23. Is every new dependency, service, layer or abstraction justified by a DEC with the alternatives considered?

## Technical soundness
24. Does section 15 show the contracts other code depends on (inputs, outputs, errors), with each sketch kept to ~20 lines?
25. Is authorization enforced close to the data, not only in the interface?
26. Does the design follow the conventions of the most similar existing feature, or explain in a DEC why it does not?

## Proportion
27. Is the spec free of function bodies and copy-pasted full schemas, with long material moved to linked appendices?
28. Is the word count within the budget for the level (L2 ≤ ~700, L3 ~2.000–5.000, L4 ~3.000–6.000), and is each fact stated once and referenced by ID elsewhere? If over budget: cut repetition first, then merge sections, then propose splitting. Never cut requested scope.
