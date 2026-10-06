import type { ReviewDiagnostic } from "@flow-dev/api/spec";

const SEVERITY_LABEL = { blocking: "Bloqueante", observation: "Observação" } as const;

export function SpecDiagnostics({ diagnostics }: { diagnostics: ReviewDiagnostic[] }) {
  if (diagnostics.length === 0) return null;
  return (
    <ul aria-label="Diagnósticos do pacote" className="space-y-1.5 text-sm">
      {diagnostics.map((item, index) => (
        <li key={`${item.code}-${index}`} role={item.severity === "blocking" ? "alert" : undefined} className={item.severity === "blocking" ? "text-destructive" : "text-ink-2"}>
          <strong className="font-medium">{SEVERITY_LABEL[item.severity]}</strong> · <code>{item.code}</code>{item.documentId ? ` · ${item.documentId}` : ""} — {item.message}
        </li>
      ))}
    </ul>
  );
}
