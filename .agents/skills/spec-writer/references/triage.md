# Triage: how much spec does this need?

## Contents
1. Signals and scoring
2. Overrides
3. Verdict format (decision-only requests)
4. Pitfalls
5. Evidence behind the rules

---

## 1. Signals and scoring

Rate signals 1–6 as **0 (low), 1 (some) or 2 (high)**. Each one asks the same thing from a different angle: will something important be lost or guessed if nothing is written down?

| # | Signal | High (2) when… | Low (0) when… |
|---|---|---|---|
| 1 | **Lifetime** | Spans several sessions, people or handoffs, or more than ~5 related tasks | Fits in one sitting with one person |
| 2 | **Discoverability** | Requirements cannot be read from the code: business rules, policy, compliance, product decisions | The codebase has an example to copy and tests or checks that verify the result |
| 3 | **Ambiguity** | Several reasonable designs with real trade-offs, or the problem itself is unclear | One obvious solution; a doc would be an "implementation manual" |
| 4 | **Risk and reversibility** | Money, auth or permissions, personal data, data migration, public API contracts, deletes | Internal, easy to revert, behind a flag |
| 5 | **Blast radius** | Crosses layers or services, creates contracts that other code consumes, several consumers | One component or file group |
| 6 | **Delegation** | Split across parallel agents or handed to long autonomous runs | You pair with the agent turn by turn |
| 7 | **Value certainty** | Not scored. If the main doubt is whether to build it at all, go to Discovery | — |

**Sum of signals 1–6 → starting level:** 0–2 → L0/L1 · 3–5 → L2 · 6–8 → L3 · 9–12 → L4.

The sum is calibration, not arithmetic. One 2 on risk can justify L2 by itself. When you deviate from the sum, say why in one line.

## 2. Overrides

- **Trivial and local** (typo, copy change, one-line fix, obvious bug with a known cause) → L0, whatever the other signals say.
- **Unvalidated value** → Discovery first. A detailed spec only makes the wrong thing easier to build.
- **Risk = 2** → never below L2. The behavior that must not change has to be written down.
- **Bug with an unclear root cause, or regression risk** → L2 bugfix mini-spec. Include the hypotheses to check and the test that reproduces the bug.
- **What is missing is an example or a check, not a decision** → recommend creating that and lower the level. For example: point the agent at the reference implementation, write the failing test first, or add the lint or architecture check.

## 3. Verdict format (decision-only requests)

Write in the user's language. Keep it to roughly 150–300 words, plus the prompt or plan for L0/L1.

```markdown
## Triagem de spec: <feature>

**Recomendação:** L3 — Spec completa
**Em uma frase:** <the decisive reason>

| Sinal | Nota | Evidência |
|---|---|---|
| Duração | 2 | <fact from the request or the code> |
| Descobribilidade | … | … |
| Ambiguidade | … | … |
| Risco | … | … |
| Alcance | … | … |
| Delegação | … | … |
| Certeza de valor | validado / não validado | … |

**O que falta ao agente:** <decisions, business rules, an example, a check…>
**Próximo passo:** <one concrete action>
**O que mudaria a recomendação:** <1–3 conditions>
**Premissas:** <only what you assumed>
```

For L0/L1, add **Prompt sugerido** or **Plano curto** with the ready-to-use text. For Discovery, add the experiment brief: outcomes, the riskiest assumptions, the smallest test, the success criterion, and when a spec would make sense.

## 4. Pitfalls

- **Defaulting to a full spec "to be safe."** That is the waterfall failure mode. Returns on extra spec drop off early.
- **Measuring size by file count.** Decisions, contracts and risk are what make work spec-worthy.
- **Assuming "large existing codebase" means L3.** Spec tools often miss existing code. If the area is discoverable, a plan that points at the reference implementation often beats a spec.
- **Asking many questions during triage.** Look things up, assume sensibly, and state what you assumed.

## 5. Evidence behind the rules

The sources live in the `spec-driven` topic of the MEMORY_IA_PALACE vault. The synthesis is in `spec-driven/outputs/queries/2026-11-21 Como funciona spec-driven development e quando usar.md`.

- **Asana, 3 months of use.**
  - SDD paid off when context had to survive across sessions, handoffs or many related tasks.
  - ~150 parallel agent migrations ran from a spec: 91% needed no revision, and the effort shipped more than a month early.
  - Another large migration needed only a short prompt, because the code had examples to follow and checks to verify the result.
  - Their guidelines: for small local changes, a conversation or short plan is enough; use spec-first to agree on a direction; anchor the spec only when decisions must survive later sessions.
  - A failure: a detailed spec drove a data migration in the wrong direction, and a one-page design doc reviewed by colleagues fixed it.
- **GitHub Spec Kit** says SDD works best for greenfield work, features in existing systems ("most powerful", if context engineering is good) and legacy modernization.
- **Kiro:**
  - Use design-first when there are strict non-functional requirements or an existing architecture.
  - Use a bugfix spec, which records the behavior that "SHALL CONTINUE TO" hold, for bugs with regression risk.
  - Fix typos and simple logic errors in chat.
- **CMU/Google study (arXiv 2608.25202):** people use SDD selectively, mainly for new features. It brings more reliable agent behavior, at higher planning and review cost. The individual benefit comes from clarifying intent before delegating.
- **Scott Logic:** Spec Kit took 33.5 min of agent time, 2,577 lines of markdown and 3.5 h of review for 689 LOC, against 8 min of iterative prompting. One anecdote.
- **Böckeler (Thoughtworks):** Kiro turned a small bug into 4 stories and 16 acceptance criteria. Agents ignored spec notes and re-created existing classes.
- **Marmelab:** SDD agents are context-blind in existing codebases and force a double code review; returns diminish as the app grows.
- **Scrum.org:** returns on specification diminish very early. SDD becomes waterfall when you chase a "bulletproof spec". Specify outcomes and assumptions instead.
- **Google design docs:** they pay off when the solution is ambiguous. A doc with no trade-offs should have been code. Google's checklist has five questions; three or more "yes" answers mean write the doc:
  1. Are you unsure of the right design?
  2. Would it help to involve senior engineers?
  3. Is the design contentious?
  4. Does the team sometimes forget cross-cutting concerns (privacy, security, logging)?
  5. Do you need a high-level view of a legacy system?
- **Real-world size reference (Compozy on Flow Dev):** one feature produced a PRD, user stories, tech spec and test contract totalling 12k–39k words, with 5–8 ADRs. That volume is a review cost to weigh against the risk.
