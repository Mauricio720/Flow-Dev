---
name: spec-writer
description: Decides how much spec a feature, bug fix or migration needs (none, short plan, mini-spec, full spec, or discovery first) and writes it as one implementation-ready document. The product part has stories, EARS requirements, Given/When/Then and business rules; the technical part has design, contracts, decisions and risks; a compact verification matrix closes it. Researches the codebase first and asks only load-bearing questions. Use whenever the user asks for a spec, especificação, PRD, tech spec, design doc, RFC or mini-spec; says "vamos especificar", "escreve a spec de…", "quero planejar essa feature antes de mandar pro agente"; or asks "vale a pena fazer spec?", "preciso de PRD pra isso?", "devo planejar antes de implementar?". Also use when someone wants a spec for something trivial, or wants to code something risky (payments, permissions, migrations) without one. Not for task breakdown (spec-to-tasks) or code.
---

# Spec Writer

Two jobs in one skill, always in this order:

1. **Decide how much spec the work needs.** The answer may be "none".
2. **Write that much,** as one document that a coding agent and a human reviewer can implement and verify against without guessing.

The decision comes first because both failure modes are expensive:
- **Over-specifying:** one Spec Kit run produced 2,577 lines of markdown and 3.5 h of review for 689 lines of code.
- **Under-specifying:** long or risky work loses intent between sessions and lets an agent build the wrong thing fast.

The question that settles it comes from Asana's three months of running spec-driven development: **what is the agent, or the next person, missing to do this well?** Supply the cheapest thing that fills that gap.

## Principles

They come from what worked and what failed in Spec Kit, Kiro, the Compozy cy-create-* skills, Google design docs, Asana's workflow and practitioner critiques. Knowing why each one exists lets you apply it with judgment.

1. **Mark, don't guess.** Left alone, an LLM fills every gap with a plausible assumption, and the wrong ones surface during implementation, where they cost the most. Every unknown becomes a question to the user or a `[PRECISA ESCLARECER: pergunta — sugestão]` marker.
2. **Facts are your job; decisions are the user's.** Look up anything the code, docs or existing specs can answer. Spend the user's attention only on intent, priorities and trade-offs.
3. **Keep every requested capability; invent none.**
   - Do not cut scope the user asked for just because the document is getting long. If it is too big, split it into separate specs instead.
   - Do not add capabilities they did not ask for. A good idea you come across goes in "Sugestões fora do escopo" for the user to accept, never into the requirements.
4. **Proportional writing.** Every line costs review time and drifts away from the code. Long specs get skimmed, and the "markdown madness" critique is about exactly this. Length comes from decisions and risk, not from filling the template:
   - Say each fact once and refer to it by ID elsewhere.
   - Omit sections that do not apply, with a one-line reason.
   - Respect the size budget for the level you chose (see the levels table below).
5. **Testable.** Every requirement has an ID and acceptance criteria someone can check. Vague adjectives get numbers or concrete behavior.
6. **Decisions, not transcripts.**
   - Record the trade-offs and the alternatives you rejected. That is the *why*, which code cannot tell the next reader.
   - Keep interface sketches to ~20 lines and link to files rather than pasting them.
   - A document that only says "here is how we will implement it" should have been code.
7. **Written for the next reader.** Open with a review summary so a reviewer can approve the *direction* without reading everything.

## Step 1 — Decide the level

Restate the request in one or two sentences. Then gather facts before judging; with a codebase, spend a few minutes on:
- where the change lands;
- the contracts and consumers it touches;
- the most similar existing feature;
- the tests in the area;
- AGENTS.md, CLAUDE.md, ADRs and existing specs.

Read `references/triage.md` for the signal rubric, the overrides and the evidence behind them. Pick a level:

| Level | When (short version) | What you produce | Size budget |
|---|---|---|---|
| **L0 — Direto** | Trivial and local: copy change, typo, obvious bug with known cause | Verdict + a ready prompt in chat. No file | ≤ 150 words |
| **L1 — Plano curto** | Small, clear, discoverable from code; one session | Verdict + a 5–15 line plan in chat. No file | ≤ 300 words |
| **L2 — Mini-spec** | Real risk or unclear root cause, but local scope (bugfix with regression risk, small feature touching permissions or data) | `references/mini-spec-template.md` | ≤ ~700 words |
| **L3 — Spec completa** | New feature with business rules, several components or contracts, real design choices | `references/spec-template.md` | ~2.000–5.000 words |
| **L4 — Spec ancorada** | L3, plus multi-session work, handoffs or parallel agents | Same as L3, kept current while uncertain; then **spec-to-tasks** | ~3.000–6.000 words. Beyond that, split the feature |
| **Discovery** | The main doubt is *whether* to build it (value not validated) | Experiment brief: outcomes, riskiest assumptions, smallest prototype, how real users validate it, when a spec would make sense | ≤ 400 words |

**Two kinds of request:**
- **Decision only** ("vale a pena fazer spec?"): deliver the verdict in the output format of `references/triage.md` and stop. For L0/L1, include the prompt or plan itself.
- **Spec requested** ("escreve a spec de…"):
  - If the level is L2–L4, say the level in one line and continue.
  - If the level is L0, L1 or Discovery, say so plainly and deliver that instead. The user explicitly asked for a document, so offer the mini-spec or full spec as an option if they still want it. Do not write a large document for a trivial change just because the word "spec" appeared.

## Step 2 — Gather context

- **Where to save:** follow the repository's convention (`docs/specs/`, `specs/`, an existing feature folder); otherwise use `docs/specs/<slug>/spec.md`. If a spec already exists, switch to update mode (see "Updating a spec").
- **Read the project's instructions and prior decisions,** then the code around the change:
  - the entities involved;
  - the closest existing feature, which shows the conventions to mirror;
  - tests in the area;
  - integration points;
  - the real verification commands.

  When the exploration is wide, delegate it to a subagent so the main context stays focused.
- **External research, optional:** for product-facing greenfield work, 2–3 web searches on how comparable products handle the same flow can surface expectations the user did not mention. Skip this for internal changes.
- **Language:** the conversation's language, or the language of the specs already in the repo. Portuguese by default for this user. IDs and EARS keywords keep their fixed form.
- Summarize what you found in 3–6 bullets with file paths. They become the "Contexto" section.

## Step 3 — Play back your understanding

Before asking anything, state in at most 6 lines:
- the problem;
- who it is for;
- what you would build;
- what you would leave out;
- the 2–4 assumptions you are making.

The user can correct the direction while that is still cheap. Asana found this step the most valuable: the questions that would change the plan come up before any code exists.

## Step 4 — Clarify the load-bearing decisions

Map the open decisions as a tree: which ones depend on which.

- **Rounds:** each round contains only the questions whose prerequisites are already settled.
- **Order:** product first (who, what, rules, limits, permissions, failure behavior), then technical (data model, contracts, integrations, migration).
- **Format:** lead each question with your recommended answer and a one-line reason. Use multiple choice when the options are predictable, worded so that "sim" accepts your recommendation.
- **Tool:** use the interactive question tool when available (up to 4 questions per call). Otherwise send a numbered list and stop to wait.
- **Categories to scan:** scope and out-of-scope; roles and permissions; entities and their lifecycle; error, empty and loading states; limits and volumes; non-functional needs (performance, security and privacy, accessibility, observability); integrations and their failure modes; concurrency; migration of existing data; terminology.
- **Skip non-load-bearing questions:** style, or details the implementer can reasonably choose.
- **Stop when** every branch that changes behavior, data or contracts is decided or parked as an open question. Usually 1–3 rounds; a mini-spec usually needs 0–1.

**Non-interactive mode.** When the user says "não pergunte" or nobody can answer, write the document anyway:
- list your assumptions in Premissas;
- mark each unresolved load-bearing point with `[PRECISA ESCLARECER: …]` and your suggestion;
- collect those questions under Questões em aberto.

Never silently settle a product decision that changes behavior.

## Step 5 — Write

Read the template for your level (`references/mini-spec-template.md` or `references/spec-template.md`). Then read `references/requirements-writing.md` for EARS, Given/When/Then, the edge-case sweep, how to quantify NFRs, and the vague words to avoid.

Rules that matter most:

- **Stable IDs:** US-01, REQ-001, NFR-01, DEC-01, V-01, Q-01. Never renumber them.
- **Requirements:** EARS form, one verifiable behavior per ID, each linked to its story.
- **Stories:** prioritized P1/P2/P3. Each is independently testable and has 2–4 Given/When/Then scenarios with concrete data.
- **Edge cases:**
  - Keep only the plausible ones.
  - When an edge case is really a requirement, write it as an EARS REQ (SE … ENTÃO …) rather than repeating it in the edge-case table.
- **Comportamento que não muda:** required whenever an existing system changes. Regressions hide in exactly what nobody wrote down.
- **Decisions:** at least the primary technical approach, with the alternatives considered and the consequences.
- **Compact verification matrix:**
  - One row per **requirement group or story**, not one row per scenario.
  - Each row lists the IDs it covers, the test level(s), the component, and the single most important expected result.
  - The test cases themselves are named, one line each, inside the row or in a short list. Do not write a separate test catalog.
  - The goal is that every REQ, every story scenario and every edge case is *traceable* to a row; spec-to-tasks later turns the rows into concrete tests.
- **Definição de pronto:** uses the project's real commands.
- **Large material** (a full schema, a long contract): put it in an appendix file next to the spec and link it.

## Step 6 — Self-review

Run `references/quality-checklist.md` against the draft and fix problems inline. These checks are unit tests for the text, not for code. Three gates matter most:

- **Scope gate:** every requirement traces to something the user asked for or confirmed. Anything else moves to Sugestões fora do escopo.
- **Simplicity gate:** any new dependency, service, layer or abstraction is justified in a DEC.
- **Proportion gate:** the document is within the size budget for its level, and contains no function bodies and no repeated facts. If it is over budget, cut repetition first, then merge sections, then propose splitting the feature. Never cut requested scope.

Report the result in one line, with the word count ("checklist: 26/28 · 3.900 palavras · pendente: Q-02").

## Step 7 — Hand off

In the chat, give:
- the file path;
- the review summary (what changes, main decisions, main risks, how it will be verified);
- the open questions, starting with the ones that change the design most;
- the suggestions left out of scope, if any;
- the next step:
  - implement directly for work that fits one session;
  - run **spec-to-tasks** for multi-session or parallel work (L4).

Changes are applied by editing the spec, not by regenerating it.

## Updating a spec

When a spec already exists:
- Read it fully and apply the change with minimal edits.
- Keep every ID; mark dropped items "(retirado)" instead of deleting their numbers.
- Add a dated line to "Histórico" with the reason.
- Mirror every behavior change into the verification matrix.

When implementation teaches you something, update the spec while the work is still uncertain. Once the code explains the implementation, suggest trimming detail that only repeats the code, and keep what the next reader needs: decisions, constraints, open risks.

## Reference files

| File | Read when |
|---|---|
| `references/triage.md` | Step 1, always: rubric, overrides, verdict format, evidence |
| `references/mini-spec-template.md` | Writing an L2 mini-spec |
| `references/spec-template.md` | Writing an L3/L4 spec |
| `references/requirements-writing.md` | Before writing requirements and stories |
| `references/quality-checklist.md` | Self-review after the draft |
