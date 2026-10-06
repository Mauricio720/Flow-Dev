# User Stories Template

`_user_stories.md` is the canonical story catalog. The TechSpec maps stories to components and the test contract builds its coverage matrix on story IDs.

## ID rules
- Stories are `US-NNN` (zero-padded, sequential). Acceptance criteria and edge cases are numbered within their story and referenced as `US-NNN.AC-N` and `US-NNN.EC-N`.
- IDs are permanent. Retire a dropped story by marking it `(withdrawn)` in the index.

## Skeleton

```markdown
# User Stories: [Feature]

## Personas
- **[Persona]** — who they are and what they need.

## Story Index
| ID | Feature Area | Persona | Story |
|----|--------------|---------|-------|
| US-001 | [area] | [persona] | [summary] |

## [Feature Area]

### US-001: [Title]
**As a** [persona], **I want** [capability], **so that** [outcome].

Acceptance criteria:
- AC-1: Given [context], when [action], then [observable result].

Edge cases:
- EC-1: [condition] → [expected behavior the user observes].
```

## Edge-case sweep
Probe every story against: invalid input, empty or missing data, limits, permissions, concurrency, interruption, repetition, ordering, state transitions and scale. Record each finding as an `EC` entry with its expected behavior. Skip a class only after actually probing it.

## Writing rules
- Describe behavior the user observes, never implementation.
- One story per capability; give secondary personas their own stories.
- Every AC is checkable against the shipped product; every EC states condition and expected behavior.
