"use client";

import { ARTIFACTS_HEADING } from "../artifactCopy";
import type { ExecutionArtifact } from "../executionContract";
import { useArtifactViewer } from "../hooks/useArtifactViewer";
import type { TerminalScope } from "../terminalContract";
import { ArtifactList } from "./ArtifactList";
import { ArtifactViewer } from "./ArtifactViewer";

type Props = { scope: TerminalScope; artifacts: ExecutionArtifact[] };

export function ArtifactSection({ scope, artifacts }: Props) {
  const viewer = useArtifactViewer(scope);
  return (
    <section aria-labelledby="execution-artifacts-heading" className="space-y-3">
      <h2 id="execution-artifacts-heading" className="text-base font-semibold">{ARTIFACTS_HEADING}</h2>
      <ArtifactList artifacts={artifacts} openId={viewer.artifactId} onOpen={(id) => void viewer.open(id)} />
      <ArtifactViewer viewer={viewer} />
    </section>
  );
}
