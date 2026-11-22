#!/usr/bin/env python3
"""Read-only scan of a git diff for mechanical signs of noisy agent output.

Usage:
  scan_diff.py [--repo PATH] [--base REF [--head REF] | --worktree] [--max-lines N] [--json]

--base REF     compare REF...HEAD (default: merge-base with main/master)
--head REF     end of the range instead of HEAD (e.g. review a single commit: --base C~1 --head C)
--worktree     compare HEAD with the working tree (uncommitted changes, incl. untracked)
--max-lines N  also flag changed source files longer than N lines (project rule, optional)

It never modifies the repository. Findings are hints for the reviewer, not verdicts:
each one must be confirmed by reading the code.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

PATTERNS = {
    "test-disabled": r"\b(it|test|describe)\.(skip|only|todo)\b|\bx(it|describe)\(|@pytest\.mark\.skip|\bt\.Skip\(",
    "hollow-assertion": r"expect\((true|false|1|0)\)\.(toBe|toEqual)\((true|false|1|0)\)|assert\s+True\b|expect\([^)]*\)\.(toBeDefined|toBeTruthy|not\.toBeNull)\(\)\s*;?|assert\.ok\(\s*[A-Za-z_$][\w$]*\s*\)|assert\s+[A-Za-z_]\w*\s*$|\(\)\s*=>\s*\{\s*\}\s*\)",
    "timeout-raised": r"(testTimeout|timeout)\s*[:=]\s*\d{5,}|setTimeout\([^,]+,\s*\d{5,}\)|jest\.setTimeout|test\.setTimeout",
    "placeholder": r"\b(TODO|FIXME|XXX|HACK)\b|not implemented|NotImplemented|throw new Error\(['\"](todo|not implemented)",
    "type-escape": r"as any\b|:\s*any\b|@ts-ignore|@ts-expect-error|@ts-nocheck|# type: ignore",
    "lint-escape": r"eslint-disable|noqa|nolint|biome-ignore|prettier-ignore",
    "debug-leftover": r"\bconsole\.(log|debug)\(|\bdebugger\b|\bprint\(|fmt\.Println\(",
    "mock-in-source": r"\b(mock|fake|dummy|stub)[A-Z_a-z]*\s*[:=]|hardcoded|lorem ipsum",
    "secret-like": r"(api[_-]?key|secret|token|password)\s*[:=]\s*['\"][^'\"]{8,}['\"]",
    "comment-added": r"^\s*(//|#(?!!)|/\*|\*\s)",
}
TEST_FILE = re.compile(r"(\.test\.|\.spec\.|_test\.|/tests?/|/__tests__/|/e2e/)")
DEP_FILES = re.compile(r"(^|/)(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|requirements[^/]*\.txt|pyproject\.toml|go\.mod|Cargo\.toml|Gemfile)$")
SOURCE_EXT = re.compile(r"\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|rb|java|kt|cs|php|vue|svelte)$")
ASSERT_LINE = re.compile(r"\b(expect|assert|should|toBe|toEqual|require\.|assertThat)\b")


def git(repo, *args):
    return subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True, check=False).stdout


def default_base(repo):
    for branch in ("main", "master", "origin/main", "origin/master"):
        mb = git(repo, "merge-base", "HEAD", branch).strip()
        if mb:
            return mb
    return "HEAD~1"


def parse_diff(diff_text):
    files, current, line_no = {}, None, 0
    for raw in diff_text.splitlines():
        if raw.startswith("+++ "):
            path = raw[4:].strip()
            current = None if path == "/dev/null" else re.sub(r"^b/", "", path)
            if current:
                files.setdefault(current, {"added": [], "removed": []})
        elif raw.startswith("@@") and current:
            m = re.search(r"\+(\d+)", raw)
            line_no = int(m.group(1)) if m else 0
        elif current and raw.startswith("+") and not raw.startswith("+++"):
            files[current]["added"].append((line_no, raw[1:]))
            line_no += 1
        elif current and raw.startswith("-") and not raw.startswith("---"):
            files[current]["removed"].append(raw[1:])
        elif current and not raw.startswith("\\"):
            line_no += 1
    return files


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=".")
    ap.add_argument("--base")
    ap.add_argument("--head", default="HEAD")
    ap.add_argument("--worktree", action="store_true")
    ap.add_argument("--max-lines", type=int)
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    repo = str(Path(a.repo).resolve())

    if a.worktree:
        rng = "HEAD (working tree)"
        diff = git(repo, "diff", "-U0", "HEAD")
        untracked = [p for p in git(repo, "ls-files", "--others", "--exclude-standard").splitlines() if p]
        for p in untracked:
            try:
                lines = (Path(repo) / p).read_text(errors="ignore").splitlines()
            except (IsADirectoryError, OSError):
                continue
            diff += f"\n+++ b/{p}\n@@ -0,0 +1,{len(lines)} @@\n" + "\n".join("+" + l for l in lines)
    else:
        base = a.base or default_base(repo)
        rng = f"{base}...{a.head}"
        diff = git(repo, "diff", "-U0", rng)

    files = parse_diff(diff)
    report = {"range": rng, "changed_files": [], "findings": [], "dependency_files": [],
              "tests_changed": [], "source_without_test_change": [], "assertions_removed": [], "long_files": []}

    any_test = any(TEST_FILE.search(f) for f in files)
    for path, d in sorted(files.items()):
        report["changed_files"].append({"path": path, "added": len(d["added"]), "removed": len(d["removed"])})
        if DEP_FILES.search(path):
            report["dependency_files"].append(path)
        is_test = bool(TEST_FILE.search(path))
        if is_test:
            report["tests_changed"].append(path)
            removed_asserts = [l.strip() for l in d["removed"] if ASSERT_LINE.search(l)]
            if removed_asserts:
                report["assertions_removed"].append({"path": path, "count": len(removed_asserts), "examples": removed_asserts[:3]})
        for line_no, text in d["added"]:
            for cat, pat in PATTERNS.items():
                if cat == "comment-added" and not SOURCE_EXT.search(path):
                    continue
                if cat in ("mock-in-source", "debug-leftover") and is_test:
                    continue
                if re.search(pat, text, re.IGNORECASE if cat in ("placeholder", "secret-like", "mock-in-source") else 0):
                    report["findings"].append({"category": cat, "path": path, "line": line_no, "text": text.strip()[:160]})
        if a.max_lines and SOURCE_EXT.search(path):
            fp = Path(repo) / path
            if fp.is_file():
                n = sum(1 for _ in fp.open(errors="ignore"))
                if n > a.max_lines:
                    report["long_files"].append({"path": path, "lines": n})
    if not any_test:
        report["source_without_test_change"] = [f["path"] for f in report["changed_files"] if SOURCE_EXT.search(f["path"])]

    if a.json:
        json.dump(report, sys.stdout, ensure_ascii=False, indent=2)
        return
    print(f"# Diff scan — {rng}\n")
    print(f"Changed files: {len(report['changed_files'])}")
    for f in report["changed_files"]:
        print(f"  {f['path']}  (+{f['added']} −{f['removed']})")
    print(f"\nDependency files changed: {', '.join(report['dependency_files']) or 'none'}")
    print(f"Test files changed: {len(report['tests_changed'])}")
    if report["source_without_test_change"]:
        print("Source changed but NO test file changed in this diff.")
    for r in report["assertions_removed"]:
        print(f"Assertions removed in {r['path']}: {r['count']} (e.g. {r['examples'][0][:100]})")
    for r in report["long_files"]:
        print(f"Long file: {r['path']} ({r['lines']} lines > {a.max_lines})")
    by_cat = {}
    for f in report["findings"]:
        by_cat.setdefault(f["category"], []).append(f)
    print("\n## Findings by category (hints — confirm each by reading the code)")
    if not by_cat:
        print("none")
    for cat, items in by_cat.items():
        print(f"\n### {cat} ({len(items)})")
        for f in items[:25]:
            print(f"  {f['path']}:{f['line']}  {f['text']}")
        if len(items) > 25:
            print(f"  … {len(items) - 25} more")


if __name__ == "__main__":
    main()
