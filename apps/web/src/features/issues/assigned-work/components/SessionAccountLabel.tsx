"use client";

import { Button } from "@/components/ui/button";
import { useWorkAccountsContext } from "../workAccountsContext";
import type { WorkAccountProvider } from "../workAccountsContract";
import { CHANGE_ACCOUNT_LABEL, sessionAccountText } from "../workAccountsCopy";

type Props = { agent: WorkAccountProvider; onBeforeJump?: () => void };

export function SessionAccountLabel({ agent, onBeforeJump }: Props) {
  const accounts = useWorkAccountsContext();
  const choice = accounts?.choiceOf(agent);
  if (!accounts || !choice) return null;
  const jump = () => {
    onBeforeJump?.();
    requestAnimationFrame(() => accounts.jumpTo(agent));
  };
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
      <span>{sessionAccountText(choice.label)}</span>
      <Button type="button" variant="ghost" size="sm" onClick={jump}>{CHANGE_ACCOUNT_LABEL}</Button>
    </div>
  );
}
