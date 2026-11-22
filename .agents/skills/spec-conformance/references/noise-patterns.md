# Noise patterns: how cheaper models drift, and how to catch it

Faster and cheaper models tend to optimize for *looking done*: green checks, a confident summary, code shaped like the request. Each pattern below has a detection method. The scanner (`scripts/scan_diff.py`) surfaces the mechanical hints; the rest needs reading.

## 1. Claimed but not done

| Pattern | How to detect |
|---|---|
| Task checkbox ticked or "done" reported, but the behavior is absent | For each spec item, find the code path that implements it. If you cannot point to it, it is ❌ |
| Stub, placeholder or "for now" implementation | Scanner `placeholder`; functions returning constants, empty arrays or `null` where the spec expects behavior; `throw new Error("not implemented")` |
| Only the happy path built | Look for the spec's SE…ENTÃO requirements and edge cases (B-xx); check each error branch exists in code |
| Integration faked | Scanner `mock-in-source`; real client replaced by an in-memory fake outside tests; hard-coded responses; feature flags defaulting to a fake |
| UI wired to nothing | Buttons or forms whose handlers are empty, `console.log` only, or call an endpoint that does not exist |

## 2. Tests that prove nothing

| Pattern | How to detect |
|---|---|
| Disabled or focused tests | Scanner `test-disabled` (`.skip`, `.only`, `xit`, `@pytest.mark.skip`) |
| Hollow assertions | Scanner `hollow-assertion`; also tests with no `expect` or `assert` at all, or only `toBeDefined()` / `not.toThrow()` where the spec defines an exact result |
| Tests that test the mock | Assertions only on mock call counts, while the behavior under test is mocked away |
| Would still pass if the feature were deleted | Mentally remove the implementation: does the test still pass? If so, it is not a test of that requirement |
| Implementation tuned to the test data | `if (input === "the exact test value")`, lookup tables matching the test fixtures, special-cased IDs |
| Assertions weakened to pass | Scanner `assertions_removed`; diffs that loosen `toEqual` to `toMatchObject`, delete cases, update snapshots wholesale |
| Timeouts or retries raised | Scanner `timeout-raised`; test config diffs (workers, retries, timeouts) |
| Spec-assigned tests missing | Map each assigned test ID (V-xx, UT/IT/E2E) to a real test name; missing IDs mean 🟡 or ❌ |

## 3. Scope drift

| Pattern | How to detect |
|---|---|
| Unrequested features or "improvements" | Changed files and exported symbols that trace to no spec item |
| Unrelated refactors or renames | Files in the diff outside the task's declared files, with changes unrelated to the spec |
| New dependencies | Scanner `dependency_files`; any new package not named in a DEC |
| Non-goals implemented | Compare against the spec's "Fora de escopo" section and its suggestions list |
| Files touched outside the task | In a single-task review: the diff vs. the task's "Arquivos" list |

## 4. Silent decisions

| Pattern | How to detect |
|---|---|
| `[PRECISA ESCLARECER]` or open questions resolved in code without being recorded | For each marker in the spec, check what the code did; if it picked an answer, the spec must say so |
| Different approach from the DEC | Library, pattern, storage or protocol different from the decision record |
| Contract changed | Names, types, error codes or response shapes differing from the spec's interfaces section; compare field by field |
| Existing behavior changed | Walk the spec's "Comportamento que não muda" items; check the code paths and their tests still hold |

## 5. Project-rule violations common in agent output

| Pattern | How to detect |
|---|---|
| Convention files ignored | Placement and layering rules from AGENTS.md vs. the paths and imports in the diff |
| File-size or complexity limits exceeded | Scanner `--max-lines`; long functions |
| Comments added against a no-comments rule | Scanner `comment-added`, then read each one against the rule's exceptions |
| Type and lint escapes | Scanner `type-escape`, `lint-escape` |
| Debug leftovers | Scanner `debug-leftover` |
| Duplicate utilities | New helpers that duplicate existing ones; grep for similar names in the repo |
| Hallucinated APIs | Imports of modules or functions that do not exist; typecheck usually catches these, so run it |
| Authorization only in the UI | Protected operations whose server-side or data-layer check is missing |
| Secrets or real tokens | Scanner `secret-like`; check it is a test fixture, not a credential |
| Process rules broken | Commits, pushes or PRs when the rules forbade them; branch rules |

## 6. Reporting false confidence

The implementer's summary claims something your evidence does not support: "all tests pass" when you saw failures, "followed the spec" while items are ❌. Record the claim and the contradicting evidence in the report. This is the most useful signal about how much to trust that agent's future reports.
