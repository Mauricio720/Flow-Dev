import Link from "next/link";
import { projectSettingsPath } from "@/lib/navigation/projectRoutes";
import type { TerminalCheckout } from "../terminalContract";
import { CHECKOUT_FOLDER_LABEL, DIRTY_WARNING, NO_CHECKOUT_MESSAGE, SETTINGS_LINK_LABEL, branchLabel } from "../terminalCopy";

export function TerminalCheckoutSummary({ checkout, projectId }: { checkout: TerminalCheckout | null; projectId: string }) {
  if (!checkout) {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-ink-2">{NO_CHECKOUT_MESSAGE}</p>
        <Link href={projectSettingsPath(projectId)} className="font-medium text-ink underline underline-offset-4">{SETTINGS_LINK_LABEL}</Link>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <dl className="grid gap-1 text-sm sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-x-4">
        <dt className="text-ink-3">{CHECKOUT_FOLDER_LABEL}</dt>
        <dd className="font-mono text-[13px] [overflow-wrap:anywhere]">{checkout.path}</dd>
        <dt className="sr-only">Branch</dt>
        <dd className="sm:col-start-2">{branchLabel(checkout.branch, checkout.detachedSha)}</dd>
      </dl>
      {checkout.dirty && <p role="status" className="text-sm text-ink-2">{DIRTY_WARNING}</p>}
    </div>
  );
}
