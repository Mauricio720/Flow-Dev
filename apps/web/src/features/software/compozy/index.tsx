"use client";

import { AppHeader } from "@/components/shared/AppHeader";
import type { SoftwareInitial } from "./contract";
import { AuditPanel } from "./components/AuditPanel";
import { ConnectionsPanel } from "./components/ConnectionsPanel";
import { LoginDialog } from "./components/LoginDialog";
import { ReadinessPanel } from "./components/ReadinessPanel";
import { SettingsForm } from "./components/SettingsForm";
import { useCodexLogin } from "./hooks/useCodexLogin";
import { useSoftwarePage } from "./hooks/useSoftwarePage";

export function SoftwareCompozy({ initial }: { initial: SoftwareInitial }) {
  const page = useSoftwarePage(initial);
  const login = useCodexLogin(() => void page.refreshAll());
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <p className="font-mono text-xs text-ink-3">SOFTWARE</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">Compozy</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink-2">Configuração global do CompozyOS: conexões de execução, prontidão do runtime e histórico de alterações.</p>
        <ReadinessPanel state={page.readiness.state} onRefresh={() => void page.readiness.refresh()} />
        <section aria-labelledby="settings-title" className="mt-10">
          <h2 id="settings-title" className="text-xl font-semibold tracking-[-0.02em]">Configuração do aplicativo</h2>
          <SettingsForm settings={page.settings} onSaved={() => void page.refreshAll()} onStale={() => void page.reloadSettings()} />
        </section>
        <ConnectionsPanel items={page.connections.items} hasMore={!!page.connections.nextCursor} failed={page.connections.failed} onLoadMore={() => void page.connections.loadMore()} onChanged={() => void page.refreshAll()} onBegin={(target, provider) => void login.begin(target, provider)} />
        <AuditPanel items={page.history.items} hasMore={!!page.history.nextCursor} onLoadMore={() => void page.history.loadMore()} />
      </main>
      <LoginDialog state={login.state} onConfirm={() => void login.confirm()} onClose={login.close} />
    </div>
  );
}
