"use client";

import { useWorkAccountsContext } from "../workAccountsContext";
import { PROVIDERS, SAVING_CHOICE_NOTE, WORK_ACCOUNTS_HEADING, WORK_ACCOUNTS_INTRO, WORK_ACCOUNTS_SECTION_ID } from "../workAccountsCopy";
import { WorkAccountSelect } from "./WorkAccountSelect";

const HEADING_ID = `${WORK_ACCOUNTS_SECTION_ID}-titulo`;

export function WorkAccountsSection() {
  const accounts = useWorkAccountsContext();
  if (!accounts?.data) return null;
  const { data } = accounts;
  return (
    <section id={WORK_ACCOUNTS_SECTION_ID} aria-labelledby={HEADING_ID} className="flex flex-col gap-4 rounded-xl border border-line bg-raised p-5">
      <div className="space-y-1">
        <h2 id={HEADING_ID} className="text-[15px] font-semibold">{WORK_ACCOUNTS_HEADING}</h2>
        <p className="text-sm leading-6 text-ink-2">{WORK_ACCOUNTS_INTRO}</p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        {PROVIDERS.map((provider) => <WorkAccountSelect key={provider} provider={provider} choice={accounts.choiceOf(provider)} options={data.options[provider]} disabled={accounts.saving !== null} onChoose={(accountId) => void accounts.choose(provider, accountId)} />)}
      </div>
      {accounts.saving && <p role="status" className="text-sm text-ink-2">{SAVING_CHOICE_NOTE}</p>}
      {accounts.message && <p role="alert" className="text-sm text-destructive">{accounts.message}</p>}
    </section>
  );
}
