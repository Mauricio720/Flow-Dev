"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { CREATE_DONE_NOTE, CREATE_HEADING, CREATE_LABEL_FIELD, CREATE_LABEL_PLACEHOLDER, CREATE_PROVIDER_LABEL, CREATE_SAVING_LABEL, CREATE_SUBMIT_LABEL } from "../agentAccountActionCopy";
import { PROVIDER_LABEL } from "../agentAccountStatusCopy";
import { useCreateAccount } from "../hooks/useCreateAccount";
import type { AgentAccount, AgentAccountProvider } from "../types";

const PROVIDER_FIELD_ID = "agent-account-provider";
const LABEL_FIELD_ID = "agent-account-label";
const LABEL_ERROR_ID = "agent-account-label-error";
const FIELD_CLASS = "h-10 rounded-lg border border-line bg-surface px-3 text-[15px]";

export function AgentAccountCreateForm({ onCreated }: { onCreated: (account: AgentAccount) => void }) {
  const form = useCreateAccount(onCreated);
  function submit(event: FormEvent) {
    event.preventDefault();
    void form.submit();
  }
  return (
    <form onSubmit={submit} aria-label={CREATE_HEADING} noValidate className="flex flex-col gap-4 rounded-xl border border-line bg-raised p-5">
      <h2 className="text-[15px] font-semibold">{CREATE_HEADING}</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor={PROVIDER_FIELD_ID} className="text-sm font-medium">{CREATE_PROVIDER_LABEL}</label>
          <select id={PROVIDER_FIELD_ID} value={form.provider} onChange={(event) => form.chooseProvider(event.target.value as AgentAccountProvider)} disabled={form.saving} className={FIELD_CLASS}>
            {(Object.keys(PROVIDER_LABEL) as AgentAccountProvider[]).map((provider) => <option key={provider} value={provider}>{PROVIDER_LABEL[provider]}</option>)}
          </select>
        </div>
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <label htmlFor={LABEL_FIELD_ID} className="text-sm font-medium">{CREATE_LABEL_FIELD}</label>
          <input id={LABEL_FIELD_ID} type="text" value={form.label} onChange={(event) => form.edit(event.target.value)} placeholder={CREATE_LABEL_PLACEHOLDER} disabled={form.saving} aria-invalid={form.message ? true : undefined} aria-describedby={form.message ? LABEL_ERROR_ID : undefined} className={FIELD_CLASS} />
        </div>
        <Button type="submit" disabled={form.saving}>{form.saving ? CREATE_SAVING_LABEL : CREATE_SUBMIT_LABEL}</Button>
      </div>
      {form.message && <p id={LABEL_ERROR_ID} role="alert" className="text-sm text-destructive">{form.message}</p>}
      {form.created && <p role="status" className="text-sm text-ink-2">{CREATE_DONE_NOTE}</p>}
    </form>
  );
}
