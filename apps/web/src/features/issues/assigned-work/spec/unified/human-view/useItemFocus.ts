"use client";

import { useEffect } from "react";
import { itemDomId } from "./humanViewNav";

export type ItemFocus = { itemId: string; nonce: number };

export function useItemFocus(focus: ItemFocus | null) {
  useEffect(() => {
    if (!focus) return;
    const element = document.getElementById(itemDomId(focus.itemId));
    element?.scrollIntoView?.({ block: "start" });
    element?.focus({ preventScroll: true });
  }, [focus]);
}
