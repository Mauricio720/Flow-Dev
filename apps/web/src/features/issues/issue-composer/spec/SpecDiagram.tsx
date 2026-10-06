"use client";

import { useEffect, useState } from "react";

const SANDBOX = "";
type Render = { status: "loading" } | { status: "ready"; frame: string } | { status: "failed" };
const SECURITY = { securityLevel: "strict" as const, startOnLoad: false, htmlLabels: false };

async function renderDiagram(source: string, id: string) {
  const [{ default: mermaid }, { default: purify }] = await Promise.all([import("mermaid"), import("dompurify")]);
  mermaid.initialize(SECURITY);
  const { svg } = await mermaid.render(id, source);
  const clean = purify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true }, FORBID_TAGS: ["script", "foreignObject", "a", "image"], FORBID_ATTR: ["onload", "onerror", "href", "xlink:href"] });
  return `<!doctype html><meta charset="utf-8"><style>body{margin:0}svg{max-width:100%;height:auto}</style>${clean}`;
}

export function SpecDiagram({ source, blocked }: { source: string; blocked: boolean }) {
  const [render, setRender] = useState<Render>({ status: "loading" });
  useEffect(() => {
    if (blocked) return;
    let active = true;
    renderDiagram(source, `spec-diagram-${crypto.randomUUID()}`).then((frame) => active && setRender({ status: "ready", frame }), () => active && setRender({ status: "failed" }));
    return () => { active = false; };
  }, [source, blocked]);
  return (
    <figure className="space-y-2">
      {!blocked && render.status === "ready" && <iframe title="Diagrama" sandbox={SANDBOX} srcDoc={render.frame} className="h-72 w-full rounded-md border border-line bg-raised" />}
      {blocked && <p role="alert" className="text-sm text-destructive">Diagrama não renderizado: conteúdo ativo bloqueado. O código-fonte completo está abaixo.</p>}
      {!blocked && render.status === "failed" && <p role="alert" className="text-sm text-destructive">Não foi possível renderizar o diagrama. O código-fonte completo está abaixo.</p>}
      <figcaption><details><summary className="cursor-pointer text-sm text-ink-2">Código do diagrama</summary><pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-sm">{source}</pre></details></figcaption>
    </figure>
  );
}
