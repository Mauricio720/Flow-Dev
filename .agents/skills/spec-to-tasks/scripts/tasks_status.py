#!/usr/bin/env python3
"""Validate a task folder (_tasks.md + task_NN.md, compozy.tasks/v2) and print its progress.

Usage: tasks_status.py <folder> [--json]

Read-only. Checks:
- manifest frontmatter (schema_version, workflow == folder name, nodes/files, edges, no cycles)
- every task_NN.md is a node and vice versa
- task frontmatter keys and values (status, title == H1, type, complexity)
- duplicate test IDs across tasks
Prints a status table, mini-task progress, blocked tasks, the next mini-task to run and, once every task
is completed, the final review status (from the "Revisão final" section of _tasks.md).
Exit code 1 when validation errors exist.
"""
import json
import re
import sys
from pathlib import Path

STATUSES = {"pending", "in_progress", "completed", "done", "finished"}
DONE = {"completed", "done", "finished"}
COMPLEXITY = {"low", "medium", "high", "critical"}
DEFAULT_TYPES = {"frontend", "backend", "docs", "test", "infra", "refactor", "chore", "bugfix"}
TEST_ID = re.compile(r"\b(?:V-\d{2,}[a-z]?|UT-\d{3}|IT-\d{3}|E2E-\d{3})\b")


def frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    return (m.group(1), text[m.end():]) if m else (None, text)


def simple_yaml(block):
    data = {}
    for line in block.splitlines():
        m = re.match(r"^([A-Za-z_]+):\s*(.*)$", line)
        if m:
            data[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    return data


def parse_graph(block):
    nodes = re.findall(r"-\s*id:\s*(task_\d+)\s*\n\s*file:\s*(\S+)", block)
    edges = re.findall(r"-\s*from:\s*(task_\d+)\s*\n\s*to:\s*(task_\d+)", block)
    return nodes, edges


def has_cycle(ids, edges):
    adj = {i: [] for i in ids}
    for a, b in edges:
        adj.setdefault(a, []).append(b)
    state = {}

    def visit(n):
        if state.get(n) == 1:
            return True
        if state.get(n) == 2:
            return False
        state[n] = 1
        if any(visit(m) for m in adj.get(n, [])):
            return True
        state[n] = 2
        return False

    return any(visit(n) for n in adj)


def section(body, title):
    m = re.search(rf"^## {title}\s*\n(.*?)(?=^## |\Z)", body, re.S | re.M)
    return m.group(1) if m else ""


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    folder = Path(sys.argv[1]).resolve()
    as_json = "--json" in sys.argv
    errors, warnings = [], []
    manifest = folder / "_tasks.md"
    if not manifest.exists():
        print(f"ERROR: {manifest} not found")
        sys.exit(1)
    fm, manifest_body = frontmatter(manifest.read_text())
    if fm is None:
        errors.append("_tasks.md has no frontmatter")
        fm = ""
    meta = simple_yaml(fm)
    if meta.get("schema_version") != "compozy.tasks/v2":
        errors.append('_tasks.md: schema_version must be "compozy.tasks/v2"')
    if meta.get("workflow") != folder.name:
        errors.append(f"_tasks.md: workflow '{meta.get('workflow')}' must match folder name '{folder.name}'")
    nodes, edges = parse_graph(fm)
    node_ids = [n for n, _ in nodes]
    for n, f in nodes:
        if f != f"{n}.md":
            errors.append(f"node {n}: file must be {n}.md (got {f})")
    if len(set(node_ids)) != len(node_ids):
        errors.append("duplicate node ids in graph")
    for a, b in edges:
        if a not in node_ids or b not in node_ids:
            errors.append(f"edge {a}->{b} references a missing node")
    if has_cycle(node_ids, edges):
        errors.append("dependency graph has a cycle")

    files = sorted(p.name for p in folder.glob("task_*.md") if re.fullmatch(r"task_\d+\.md", p.name))
    for f in files:
        if f[:-3] not in node_ids:
            errors.append(f"{f} exists but is not a node in _tasks.md")
    for n in node_ids:
        if f"{n}.md" not in files:
            errors.append(f"node {n} has no file {n}.md")

    tasks, test_owner = {}, {}
    for f in files:
        tid = f[:-3]
        text = (folder / f).read_text()
        tfm, body = frontmatter(text)
        if tfm is None:
            errors.append(f"{f}: missing frontmatter")
            continue
        t = simple_yaml(tfm)
        extra = set(t) - {"status", "title", "type", "complexity"}
        if extra:
            errors.append(f"{f}: unexpected frontmatter keys {sorted(extra)} (dependencies belong in _tasks.md)")
        if t.get("status") not in STATUSES:
            errors.append(f"{f}: invalid status '{t.get('status')}'")
        if t.get("complexity") not in COMPLEXITY:
            errors.append(f"{f}: invalid complexity '{t.get('complexity')}'")
        if t.get("type") not in DEFAULT_TYPES:
            warnings.append(f"{f}: type '{t.get('type')}' is not a default type (ok if defined in .compozy/config.toml)")
        h1 = re.search(r"^# .*?:\s*(.+)$", body, re.M)
        if not h1 or h1.group(1).strip() != t.get("title", "").strip():
            errors.append(f"{f}: title must match the H1 ('# Task NN: <title>')")
        minis = re.findall(r"^- \[( |x|X)\] (?:\*\*)?(\d+\.\d+)\b", body, re.M)
        done_minis = [m for c, m in minis if c.lower() == "x"]
        if not minis:
            warnings.append(f"{f}: no mini-tasks found (expected '- [ ] **NN.M — …**')")
        assigned = set(TEST_ID.findall(section(body, "Testes atribuídos") or section(body, "Tests")))
        for tid_ in assigned:
            if tid_ in test_owner:
                errors.append(f"test {tid_} assigned to both {test_owner[tid_]} and {tid}")
            test_owner[tid_] = tid
        if t.get("status") in DONE and minis and len(done_minis) < len(minis):
            errors.append(f"{f}: status completed but {len(minis) - len(done_minis)} mini-task(s) unchecked")
        if t.get("status") == "pending" and done_minis:
            warnings.append(f"{f}: status pending but {len(done_minis)} mini-task(s) checked (should be in_progress)")
        tasks[tid] = {"file": f, "title": t.get("title"), "status": t.get("status"), "minis": [m for _, m in minis],
                      "done": done_minis}

    deps = {n: [a for a, b in edges if b == n] for n in node_ids}
    for tid, info in tasks.items():
        info["blocked_by"] = [d for d in deps.get(tid, []) if tasks.get(d, {}).get("status") not in DONE]
    next_step = None
    for tid in sorted(tasks):
        info = tasks[tid]
        if info["status"] in DONE or info["blocked_by"]:
            continue
        pending = [m for m in info["minis"] if m not in info["done"]]
        if pending:
            next_step = (tid, pending[0])
            break

    all_done = bool(tasks) and all(t["status"] in DONE for t in tasks.values())
    reviews = [l.strip() for l in section(manifest_body, "Revisão final").splitlines() if l.strip().startswith("- ")]
    last = reviews[-1] if reviews else ""
    final_verdict = next((v for v in ("REPROVADO", "APROVADO COM RESSALVAS", "APROVADO") if v in last), None)

    if as_json:
        json.dump({"errors": errors, "warnings": warnings, "tasks": tasks, "next": next_step,
                   "all_tasks_completed": all_done, "final_review": final_verdict}, sys.stdout, ensure_ascii=False, indent=2)
    else:
        total = sum(len(t["minis"]) for t in tasks.values())
        done = sum(len(t["done"]) for t in tasks.values())
        print(f"# {folder.name}: {len(tasks)} tarefas · mini-tarefas {done}/{total}\n")
        print("| Tarefa | Status | Mini-tarefas | Bloqueada por |")
        print("|---|---|---|---|")
        for tid in sorted(tasks):
            t = tasks[tid]
            print(f"| {tid} — {t['title']} | {t['status']} | {len(t['done'])}/{len(t['minis'])} | {', '.join(t['blocked_by']) or '—'} |")
        if next_step:
            print(f"\nPróxima: {next_step[0]} · mini-tarefa {next_step[1]}")
        elif all_done and final_verdict in (None, "REPROVADO"):
            what = "revisão final (spec-conformance na feature inteira)" if final_verdict is None else "aplicar o prompt de correção da última revisão e rodar nova revisão final"
            print(f"\nPróxima: {what}")
        elif all_done:
            print(f"\nFeature concluída · revisão final: {final_verdict}")
        else:
            print("\nPróxima: nenhuma liberada (tarefas em andamento ou bloqueadas)")
        if reviews:
            print(f"Última revisão final: {last.lstrip('- ')}")
        for w in warnings:
            print(f"AVISO: {w}")
        for e in errors:
            print(f"ERRO: {e}")
        print("\nValidação: OK" if not errors else f"\nValidação: {len(errors)} erro(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
