"use client";

import Link from "next/link";
import { STATUS_LABEL } from "@/lib/agentAccounts/accountLabels";
import { AI_ACCOUNTS_PATH } from "@/lib/navigation/accountRoutes";
import type { WorkAccountChoice, WorkAccountOption, WorkAccountProvider } from "../workAccountsContract";
import { ACCOUNT_SELECT_LABEL, DEFAULT_ACCOUNT_OPTION, REGISTER_ACCOUNTS_LABEL, accountSelectId } from "../workAccountsCopy";

const DEFAULT_VALUE = "";
type Props = { provider: WorkAccountProvider; choice: WorkAccountChoice | null; options: WorkAccountOption[]; disabled: boolean; onChoose: (accountId: string | null) => void };

function optionText(option: WorkAccountOption) {
  return `${option.label} · ${STATUS_LABEL[option.status]}`;
}

function MissingChoice({ choice, options }: { choice: WorkAccountChoice | null; options: WorkAccountOption[] }) {
  if (!choice?.accountId || options.some((option) => option.id === choice.accountId)) return null;
  return <option value={choice.accountId} disabled>{choice.label}</option>;
}

export function WorkAccountSelect({ provider, choice, options, disabled, onChoose }: Props) {
  const id = accountSelectId(provider);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">{ACCOUNT_SELECT_LABEL[provider]}</label>
      <select id={id} value={choice?.accountId ?? DEFAULT_VALUE} disabled={disabled} onChange={(event) => onChoose(event.target.value || null)} className="h-10 rounded-lg border border-line bg-surface px-3 text-[15px]">
        <option value={DEFAULT_VALUE}>{DEFAULT_ACCOUNT_OPTION}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{optionText(option)}</option>)}
        <MissingChoice choice={choice} options={options} />
      </select>
      {options.length === 0 && <Link href={AI_ACCOUNTS_PATH} className="w-fit text-sm text-ink-2 underline underline-offset-2 hover:text-ink">{REGISTER_ACCOUNTS_LABEL}</Link>}
    </div>
  );
}
