---
name: spec-conformance
description: Reviews an implementation, typically the whole feature once all its tasks are done (or a branch, or uncommitted changes), against its spec and against the project's own rules in CLAUDE.md, AGENTS.md, nested AGENTS.md files, rules folders and the skills they mandate. It reports what is missing, partial, out of scope or in violation, with file:line evidence and fresh test/typecheck output, and ends with a verdict and a ready-to-send fix list. It is built to catch the noise cheaper or faster models leave behind, such as requirements claimed but not done, stubs and placeholders, hollow or disabled tests, silent scope creep, decisions changed without notice, and broken project conventions. Use whenever the user asks to "revisar se bateu com a spec", "conferir a implementação", "validar o que o agente fez", "checar se respeitou o AGENTS.md/CLAUDE.md", "fazer o review da task", or after an agent reports a task done and before merging. Review-only; it never edits code.
---

# Spec Conformance Review

Check, independently and with evidence, whether the code that was delivered matches:
1. **the spec**: what was agreed;
2. **the project's rules**: how things must be done in this repository.

Implementation is increasingly done by cheaper or faster models. The typical problem is not code that fails to compile. It is plausible-looking work that drifts from the contract:
- a requirement marked done that was only half built;
- a test that asserts nothing;
- a dependency the spec never mentioned;
- a 180-line file in a repo that forbids more than 100;
- a "temporary" mock left in production code.

These pass a quick glance and a green build. This review exists to catch them before they reach main.

## Ground rules

These matter more than any checklist, because they are what make the review trustworthy:

1. **Don't trust the implementer's report.**
   - Task checkboxes, "done" messages, commit messages and PR descriptions are claims, not evidence.
   - Verify from the diff, the code as it stands, and commands you run yourself in this session.
   - "The agent said tests pass" is not evidence; your own test output is.
2. **The spec is the contract.**
   - When code and spec disagree, the default finding is that the code is wrong. Do not reinterpret the spec to match what was built.
   - Two exceptions:
     - the spec is ambiguous, or marked `[PRECISA ESCLARECER]`;
     - the implementation found a real problem the spec did not foresee.

     Report these as **spec updates to discuss**, not as code defects.
3. **Every finding has evidence:**
   - the code location (`path:line`, plus a short quote);
   - the source of the rule or requirement (spec ID, or `AGENTS.md:line`);
   - why they conflict.

   No evidence, no finding.
4. **Verify before flagging.** Before calling something a violation, check whether it is justified: an adjacent comment explaining the exception, a DEC in the spec, an ADR, an explicit carve-out in the rules. Unconventional is not the same as wrong.
5. **Signal over volume.**
   - One finding per distinct problem; list the other places it occurs inside that finding.
   - Skip what the project's linters and formatters already enforce; run them instead.
   - Eight precise findings beat thirty marginal ones.
6. **Review only.** Do not edit code, specs, task files or instruction files. You may write only:
   - the report;
   - one line in the "Revisão final" section of `_tasks.md` (see step 7).

   Never tick a mini-task or change a task's `status`. Commands that only read or verify (tests, typecheck, lint, the diff scanner) are fine. Respect any limits the project sets on them; for example, AGENTS.md may say which suites to run and when.

## Workflow

### 1. Fix the scope

Determine three things, asking only if they cannot be inferred:

- **What is being reviewed:**
  - a feature branch, `git diff <base>...HEAD` (default base: the merge-base with main);
  - a single commit or range;
  - uncommitted work (`git diff HEAD` plus untracked files);
  - or the whole feature of a spec-to-tasks folder (`_tasks.md` + `task_NN.md`), which is the default final gate; a single task only on explicit request.
- **Which spec:**
  - `spec.md` (spec-writer), plus `tasks.md` if present;
  - or Compozy's `_prd.md`, `_techspec.md`, `_tests.md`, `_tasks.md` and `task_NN.md`;
  - or a one-shot doc, or a design doc.

  If there is no spec, say so and review against the project rules only, stating that the requirements check was skipped.
- **Depth:**
  - **Whole feature:** every spec item.
  - **Single task:** only the items that task owns (its "Cobre" and assigned tests), plus a regression check on the "Comportamento que não muda" section.
- **When the spec folder has a `_tasks.md` (from spec-to-tasks), the review is the final gate.** It runs once, after every task is `completed`, and covers the whole feature: every spec item, every task and every rule.
  - **Check readiness first:** run `python3 -I <spec-to-tasks-skill-dir>/scripts/tasks_status.py <spec-dir>` if that skill is present; otherwise read each `task_NN.md` frontmatter.
  - **If any task is not `completed`:** report which tasks are still open, and stop. Review only if the user explicitly asks for a partial review, and label the report "parcial".
  - **Single-task reviews:** do them only when the user explicitly asks for one.

### 2. Gather the rules

Read `references/instruction-sources.md` and collect every instruction that applies to the changed files:
- the root CLAUDE.md and AGENTS.md, including their `@imports`;
- nested AGENTS.md or CLAUDE.md files in the directories the diff touches;
- the rules files they reference (e.g. `.agents/rules/*.md`);
- the skills the instructions make **mandatory** for the kind of change, at least their core rules;
- **the project's testing skill** (in this user's projects, `software-testing`), whether or not the instructions name it. It is the yardstick for judging the tests in step 5.

Turn them into a short checklist of **normative, checkable statements**: "never", "must", "always", limits, required patterns, required verification. Prefer concrete checks: "no `.ts` file over 100 lines" is checkable; "write clean code" is not, so leave it out.

### 3. Build the spec checklist

From the spec, list the items in scope by ID:
- REQ and NFR;
- story acceptance scenarios;
- edge cases;
- **comportamento que não muda;**
- decisions (DEC/ADR: the chosen approach, the libraries and the patterns);
- **out-of-scope items and non-goals**, which are things that must *not* appear;
- the tests the spec or task assigned (V-xx, UT/IT/E2E IDs);
- the files and interfaces the task declared.

Compare against the canonical spec artifacts, never against a task file's paraphrase of them. Paraphrase-level similarity is not conformance.

### 4. Scan the diff mechanically

Run the bundled scanner from the repository root:

```bash
python3 -I <skill-dir>/scripts/scan_diff.py --repo . --base <base> [--head <ref>] [--max-lines N]
# or, for uncommitted work:
python3 -I <skill-dir>/scripts/scan_diff.py --repo . --worktree
```

Pass `--max-lines` only when the project sets a file-size limit. The scanner is read-only. It lists:
- the changed files;
- changed dependency files;
- whether tests changed at all;
- removed assertions;
- long files;
- added lines that look like disabled tests, hollow assertions, raised timeouts, placeholders, type or lint escapes, debug leftovers, mocks in source code, secret-like strings and added comments.

Its output is a set of **hints**: confirm each one by reading the code before it becomes a finding. Also run the project's linters if they exist; whatever they report is not your finding to duplicate.

### 5. Read the code and judge each item

Read the changed files in full: core implementation first, then tests, then glue code. If the diff is over ~15 files, prioritize:
- new modules and exported APIs;
- the files with the most additions;
- anything touching auth, data or money.

For each spec item, assign a status:
- ✅ **Atende:** implemented, and a real test proves it.
- 🟡 **Parcial:** implemented but untested, or tested only on the happy path, or missing a branch the spec requires.
- ❌ **Ausente:** not implemented, or only stubbed.
- 🔀 **Divergente:** implemented differently from the spec or a DEC.
- ⛔ **Fora de escopo:** something the spec excludes is present, or something unrequested was added.

For each project rule, record either compliance or the violations with evidence.

**Judge the tests with the project's testing skill.** For `software-testing`, follow its review guide, `references/revisao-e-diagnostico.md`:
- For each test that covers a spec item, try to write the counterexample: "if the function always returned zero", "if the database did not persist", "if the provider returned 500". Would the test fail for the right reason?
- Check that the expected values come from the spec, not from re-running the implementation's own logic.
- Check that the doubles match the risk. A mocked repository proves nothing about a query.
- Look for flakiness: time, order, shared state, fixed sleeps.
- Report each test finding as **local → evidence → behavior that escapes → consequence → minimal fix**. Distinguish findings confirmed by running tests from findings inferred from reading the code.

Then walk through `references/noise-patterns.md`. It is the catalog of how cheaper models typically go wrong, and each pattern comes with a way to check it. Pay particular attention to:
- tests that would still pass if the feature were deleted;
- implementation that hard-codes the exact values the tests use;
- silently resolved `[PRECISA ESCLARECER]` items;
- authorization enforced only in the UI;
- existing behavior that changed without being in the spec.

### 6. Verify with fresh evidence

Run the verification commands the project defines, proportionally, as AGENTS.md or the spec's Definição de pronto says. Usually that means the affected test files, typecheck and lint for the changed packages, and the full suite or e2e only when the change and the rules call for it.

Record each command, its exit code, and the key output lines (passed/failed counts, the first errors). If a command cannot run (missing service, missing credentials), say so explicitly. Never infer a pass.

A green run does not prove conformance; it proves the existing tests pass. Conformance comes from steps 3–5.

### 7. Report

Read `references/report-template.md` and write the report in the user's language. Save it next to the spec as `reviews/review-NNN.md`, using the next free number, unless the user only wants it in chat. It contains:
- **Verdict:**
  - **APROVADO:** no blocking or important findings.
  - **APROVADO COM RESSALVAS:** only minor findings, or spec updates to discuss.
  - **REPROVADO:** any blocking finding, any ❌ item in scope, or a failing verification command.
- **The spec conformance table and the project-rules table,** each item with its evidence.
- **Findings,** each with a severity:
  - **Bloqueante:** missing requirement, broken "não muda", security or data risk, failing tests, disabled or hollow tests covering spec behavior.
  - **Importante:** partial requirement, divergence from a DEC, rule violation with real impact, unrequested dependency or scope.
  - **Menor:** conventions, clarity.
- **Spec updates to discuss:** places where the code is arguably right and the spec should change.
- **Correction prompt:** a self-contained instruction the user can paste to the implementing agent. It lists the fixes in priority order, each with its file, the rule or spec ID, and the expected result, plus the verification commands that must pass afterwards. Keep it to fixes; no praise, no recap.

**Tracking (feature with `_tasks.md`):**
- Append one line to the "Revisão final" section of `_tasks.md`, for example: `- AAAA-MM-DD · review-NNN · REPROVADO (2 bloqueantes) · reviews/review-NNN.md`.
- Before judging, check the claims recorded in the task files:
  - every ticked `[x]` mini-task and every "Registro de execução" entry must be backed by your own evidence;
  - a ticked mini-task whose "Pronto quando" does not pass now is a finding;
  - a task marked `completed` with unproven success criteria is a finding.
- **Group the findings by task** (task_02 · 02.3) so the correction prompt can be applied task by task.
- **After a REPROVADO,** the next review covers the fixes and re-checks everything the fixes touched. Do not re-check only the findings you already listed.

In chat, give the verdict, the counts per severity, the top three findings, and the report's path.

## When there is no spec

Review against the project rules and the noise patterns only. Recommend writing at least a mini-spec with **spec-writer** if the change is risky, because without acceptance criteria "done" cannot be checked.

## Reference files

| File | Read when |
|---|---|
| `references/instruction-sources.md` | Step 2: where project rules live and how to turn them into checks |
| `references/noise-patterns.md` | Step 5: the failure modes of cheaper models and how to detect each |
| `references/report-template.md` | Step 7: the report structure and the correction prompt |
| `scripts/scan_diff.py` | Step 4: run it; don't read it unless it misbehaves |
