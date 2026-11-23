"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { LocalCheckoutEditor } from "../hooks/useLocalCheckout";
import { LOCAL_CHECKOUT_EMPTY_NOTE, LOCAL_CHECKOUT_FIELD_LABEL, LOCAL_CHECKOUT_HEADING, LOCAL_CHECKOUT_PICK_LABEL, LOCAL_CHECKOUT_PICKING_LABEL, LOCAL_CHECKOUT_PLACEHOLDER, LOCAL_CHECKOUT_REMOVE_LABEL, LOCAL_CHECKOUT_SAVE_LABEL, LOCAL_CHECKOUT_SAVING_LABEL, LOCAL_CHECKOUT_STATUS_NOTE, verifiedNote } from "../localCheckoutCopy";

const FIELD_ID = "local-checkout-path";

function LinkedFolder({ saved }: { saved: LocalCheckoutEditor["saved"] }) {
  if (!saved) return <p className="text-sm text-ink-3">{LOCAL_CHECKOUT_EMPTY_NOTE}</p>;
  return (
    <div className="text-sm">
      <p className="font-medium [overflow-wrap:anywhere]">{saved.path}</p>
      <p className="mt-1 text-ink-3">{verifiedNote(saved.verifiedAt)}</p>
    </div>
  );
}

export function LocalCheckoutForm({ checkout }: { checkout: LocalCheckoutEditor }) {
  const saving = checkout.status === "saving";
  const busy = saving || checkout.status === "picking";
  function submit(event: FormEvent) {
    event.preventDefault();
    void checkout.save();
  }
  return (
    <form onSubmit={submit} aria-label={LOCAL_CHECKOUT_HEADING} noValidate className="flex flex-col gap-4 rounded-xl border border-line bg-raised p-5">
      <LinkedFolder saved={checkout.saved} />
      <div className="flex flex-col gap-2">
        <label htmlFor={FIELD_ID} className="text-sm font-medium">{LOCAL_CHECKOUT_FIELD_LABEL}</label>
        <div className="flex gap-2">
          <input id={FIELD_ID} type="text" value={checkout.path} onChange={(event) => checkout.edit(event.target.value)} placeholder={LOCAL_CHECKOUT_PLACEHOLDER} disabled={busy} className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-[15px]" />
          <Button type="button" variant="outline" disabled={busy} onClick={() => void checkout.pick()}>{LOCAL_CHECKOUT_PICK_LABEL}</Button>
        </div>
        {checkout.status === "picking" && <p role="status" className="text-sm text-ink-2">{LOCAL_CHECKOUT_PICKING_LABEL}</p>}
      </div>
      {checkout.message && <p role="alert" className="text-sm text-destructive">{checkout.message}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>{saving ? LOCAL_CHECKOUT_SAVING_LABEL : LOCAL_CHECKOUT_SAVE_LABEL}</Button>
        {checkout.saved && <Button type="button" variant="ghost" disabled={busy} onClick={() => void checkout.remove()}>{LOCAL_CHECKOUT_REMOVE_LABEL}</Button>}
        {LOCAL_CHECKOUT_STATUS_NOTE[checkout.status] && <p role="status" className="text-sm text-ink-2">{LOCAL_CHECKOUT_STATUS_NOTE[checkout.status]}</p>}
      </div>
    </form>
  );
}
