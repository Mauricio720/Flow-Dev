"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { FlowTarget } from "./unifiedContract";

type Repository = { owner: string; name: string };

const LINK_CLASS = "inline-flex h-10 items-center rounded-lg text-sm font-medium text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-project";

function pullRequestsUrl(repository: Repository, branch: string) {
  const query = encodeURIComponent(`is:pr head:${branch}`);
  return `https://github.com/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}/pulls?q=${query}`;
}

export function PullRequestLink({ target }: { target: FlowTarget }) {
  const [repository, setRepository] = useState<Repository | null>(null);
  const branch = `flow/issue-${target.taskId}`;

  useEffect(() => {
    let active = true;
    trpc.projects.repositoryContext.query({ projectId: target.projectId }).then(
      (context) => {
        if (active) setRepository({ owner: context.repository.owner, name: context.repository.name });
      },
      () => undefined,
    );
    return () => { active = false; };
  }, [target.projectId]);

  if (!repository) return null;
  return (
    <p className="text-sm text-ink-2">
      <a className={LINK_CLASS} href={pullRequestsUrl(repository, branch)} target="_blank" rel="noopener noreferrer">Ver a Pull Request no GitHub</a>
      <span className="ml-2 text-xs text-ink-3">{repository.owner}/{repository.name} · branch <code className="font-mono">{branch}</code></span>
    </p>
  );
}
