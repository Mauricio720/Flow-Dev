"use client";

import { useRef, useState } from "react";
import { fetchArtifactContent, fetchArtifactVersions } from "../artifactClient";
import { ARTIFACT_LOAD_FAILED } from "../artifactCopy";
import type { TerminalScope } from "../terminalContract";

type Content = Awaited<ReturnType<typeof fetchArtifactContent>>;
type Versions = Awaited<ReturnType<typeof fetchArtifactVersions>>[number]["versions"];

export function useArtifactViewer(scope: TerminalScope) {
  const [current, setCurrent] = useState<Content | null>(null);
  const [versions, setVersions] = useState<Versions>([]);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const latestRequest = useRef(0);
  async function load(id: string, version?: number) {
    const request = ++latestRequest.current;
    setLoading(true);
    setFailure(null);
    try {
      const [content, listing] = await Promise.all([fetchArtifactContent(scope, { artifactId: id, version }), fetchArtifactVersions(scope)]);
      if (request !== latestRequest.current) return;
      setCurrent(content);
      setVersions(listing.find((item) => item.id === id)?.versions ?? []);
    } catch {
      if (request === latestRequest.current) setFailure(ARTIFACT_LOAD_FAILED);
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }
  const open = (id: string) => { setArtifactId(id); return load(id); };
  const selectVersion = (version: number) => (artifactId ? load(artifactId, version) : Promise.resolve());
  return { open, selectVersion, current, versions, loading, failure, artifactId };
}

export type ArtifactViewerState = ReturnType<typeof useArtifactViewer>;
