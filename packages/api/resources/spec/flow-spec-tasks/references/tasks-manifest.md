# `_tasks.md` Manifest

```markdown
---
schema_version: "compozy.tasks/v2"
workflow: [feature-name]
graph:
  nodes:
    - id: task_01
      file: task_01.md
  edges:
    - from: task_01
      to: task_02
---

# [Feature Name] Task List

## Execution Order
[Why the order is what it is.]

## Gate Plan
| Gate IDs | Trigger and command/scope | Owning surface |
|----------|---------------------------|----------------|
```

Rules:
- `schema_version` is exactly `compozy.tasks/v2`; `workflow` matches the work-item folder name.
- Every task appears exactly once in `graph.nodes` with canonical ids (`task_01`, `task_02`, ...) and matching files.
- An edge means `from` must finish before `to` can start. The graph is acyclic.
- Dependencies are stored only here, never in task frontmatter.
