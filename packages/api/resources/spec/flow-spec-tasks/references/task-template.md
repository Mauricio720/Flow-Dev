# Task File Template

```markdown
---
status: pending
title: [Task title]
type: [frontend | backend | docs | test | infra | refactor | chore | bugfix]
complexity: [low | medium | high | critical]
---

# Task N: [Title]

## Overview
[Two or three sentences: what slice this task delivers and why.]

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs before starting
- REFERENCE TECHSPEC for implementation details; do not duplicate here
- FOCUS ON "WHAT"; describe what needs to be accomplished, not how
- MINIMIZE CODE; show code only to illustrate current structure or problem areas
- TESTS REQUIRED: implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- [Specific requirement using MUST/SHOULD language]
</requirements>

## Subtasks
- [ ] N.1 [WHAT to accomplish]

## Implementation Details
[Files to create or modify and integration points; reference the TechSpec for patterns.]

### Relevant Files
- `path/to/file`: [reason]

### Dependent Files
- `path/to/file`: [reason]

### Related ADRs
- [ADR-NNN: Title](../adrs/adr-NNN.md): [relevance]

## Deliverables
- [Concrete output]
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**

## Tests
- [ ] UT-NNN, IT-NNN: [behavior covered]

### Deferred Gates
- [ ] E2E-NNN (`feature-gate`): [command or scope]

## Success Criteria
- Every task-required test case implemented and passing
- [Measurable outcome]
```

Write one subtask per coherent unit of work; robust tasks usually carry five to twelve.
