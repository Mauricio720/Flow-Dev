# Where project rules live, and how to turn them into checks

## Collect

Look for these, in order. Read everything that applies to the files in the diff.

1. **Root instructions:** `CLAUDE.md`, `AGENTS.md`, `.claude/CLAUDE.md`.
   - Follow `@path` imports: in CLAUDE.md, `@AGENTS.md` means "include AGENTS.md".
   - Follow sentences like "Leia e aplique X". When an instruction tells the agent to read a file, that file's rules are part of the contract.
2. **Nested instructions:** for each directory the diff touches, walk up to the repo root and collect any `AGENTS.md` or `CLAUDE.md` on the way (e.g. `apps/web/AGENTS.md`). The nearest one adds rules for that subtree; it does not replace the root one.
3. **Rules folders:** `.agents/rules/`, `.claude/rules/`, `.cursor/rules/`, `docs/conventions*`, `CONTRIBUTING.md`, and any file the instructions reference.
4. **Mandatory skills:** instructions often contain a table like "Tarefa → Skill obrigatória".
   - For each row that matches the kind of change in the diff (backend layer, tRPC procedure, folder structure, e2e tests…), read that skill's SKILL.md and extract its core rules.
   - Do not run the skill. Extract its constraints, such as where files go, which layer may call which, and naming.
5. **Product and design docs** the instructions point to (`PRODUCT.md`, `DESIGN.md`). Usually they only matter for UI copy, language and visual rules.
6. **Tooling config that encodes rules:** lint and format configs, `tsconfig` strictness, test config. Don't re-check what the tools enforce; run the tools.

If two sources conflict, the more specific one (nearest to the file) wins for that file, unless the root says otherwise. Note the conflict in the report.

## Turn into checks

Keep only **normative, checkable** statements. For each, write:
- the rule in a few words;
- its source (`file:line`);
- how you will check it.

| Kind of rule | Example | How to check |
|---|---|---|
| Limit | "Never create `.ts` files with more than 100 lines" | `--max-lines 100` in the scanner; `wc -l` on changed files |
| Prohibition | "Do not add comments to the code" | Scanner category `comment-added`; read each to see if it falls under the stated exceptions |
| Placement | "Pages live in `app/`, components in `features/<x>/components`" | Compare the diff's file paths to the rule |
| Layering | "Controllers call services; only DAOs touch the database" | Read imports in the changed files; grep for DB client imports outside DAOs |
| Required pattern | "Authorization close to the data, not only in the UI" | Find the data access for each protected operation; confirm the check is there |
| Verification duty | "Run the affected test files and the package typecheck" | Run them yourself; also check whether the implementer's report claims to have run them |
| Language and copy | "UI in Portuguese" | Read the user-facing strings in the diff |
| Process | "Do not commit / do not open PRs / ask before creating branches" | `git log` for the reviewed range, the branch name, and whether a PR exists |
| Test discipline | "Do not raise `testTimeout` or reduce workers to work around slowness" | Scanner category `timeout-raised`; diff of test config files |

Leave out aspirational statements ("write clean code", "be careful"). They cannot be checked, and they produce opinion findings.

## Report the source

Every rule finding cites where the rule came from, for example `AGENTS.md:14` or `.agents/rules/code-standards.md:42`. Without the citation, the implementer cannot tell a real rule from the reviewer's taste.
