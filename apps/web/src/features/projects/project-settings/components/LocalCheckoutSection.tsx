"use client";

import type { LocalCheckout } from "@/lib/projects/contract";
import { useLocalCheckout } from "../hooks/useLocalCheckout";
import { LOCAL_CHECKOUT_HEADING, LOCAL_CHECKOUT_INTRO } from "../localCheckoutCopy";
import { LocalCheckoutForm } from "./LocalCheckoutForm";

export function LocalCheckoutSection({ projectId, initial }: { projectId: string; initial: LocalCheckout }) {
  const checkout = useLocalCheckout(projectId, initial);
  return (
    <section aria-labelledby="settings-local-checkout" className="mt-10 flex flex-col gap-4">
      <h2 id="settings-local-checkout" className="text-[15px] font-semibold">{LOCAL_CHECKOUT_HEADING}</h2>
      <p className="max-w-xl text-sm leading-6 text-ink-2">{LOCAL_CHECKOUT_INTRO}</p>
      <LocalCheckoutForm checkout={checkout} />
    </section>
  );
}
