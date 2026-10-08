import { Button } from "@/components/ui/button";
import type { ConnectionRow } from "../contract";
import { AUTH_STATE_LABELS, REASON_ACTIONS } from "../copy";
import { StateText } from "./StateText";

type Props = {
  row: ConnectionRow;
  onReconnect: (row: ConnectionRow) => void;
  onRename: (row: ConnectionRow) => void;
  onDisconnect: (row: ConnectionRow) => void;
};

const PROVIDER_LABELS: Record<string, string> = { codex: "Codex (ChatGPT)", claude: "Claude Code" };
const CHECK_TIME = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function ConnectionRowView({ row, onReconnect, onRename, onDisconnect }: Props) {
  const reason = row.readiness.reasonCode ? REASON_ACTIONS[row.readiness.reasonCode] : null;
  const connectable = row.authState !== "unconnected" || !row.disabled;
  const canDisconnect = row.authState !== "unconnected" && row.authState !== "disconnected";
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-[15px] font-semibold">{row.label}</p>
        <p className="text-sm text-ink-2">{PROVIDER_LABELS[row.providerKind]} · {AUTH_STATE_LABELS[row.authState]}{row.accountLabel ? ` · ${row.accountLabel}` : ""}</p>
        <div className="flex flex-wrap items-center gap-x-3 text-sm"><StateText state={row.readiness.state} /><span className="text-ink-3">Modelos selecionáveis: {row.readiness.selectableModels}</span></div>
        {reason && <p className="text-sm text-ink-2">{reason}</p>}
        <p className="text-xs text-ink-3">{row.lastCheckedAt ? `Última verificação: ${CHECK_TIME.format(new Date(row.lastCheckedAt))}` : "Ainda não verificada"} · Execuções ativas: {row.activeRuns}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {connectable && <Button type="button" variant="outline" size="sm" onClick={() => onReconnect(row)}>{row.authState === "connected" ? "Reconectar" : "Conectar"}</Button>}
        <Button type="button" variant="ghost" size="sm" onClick={() => onRename(row)}>Renomear</Button>
        {canDisconnect && <Button type="button" variant="ghost" size="sm" onClick={() => onDisconnect(row)}>Desconectar</Button>}
      </div>
    </li>
  );
}
