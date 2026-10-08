"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SpecLoad, SpecSelection } from "./specContract";
import type { FlowLoad } from "./unified/unifiedContract";

export type SpecInitial = { load: SpecLoad; selection: SpecSelection; flow?: FlowLoad };
const EMPTY: SpecInitial = { load: { kind: "none" }, selection: { stage: null, packageId: null, documentId: null } };
const SpecInitialContext = createContext<SpecInitial>(EMPTY);

export function SpecInitialProvider({ value, children }: { value: SpecInitial | undefined; children: ReactNode }) {
  return <SpecInitialContext.Provider value={value ?? EMPTY}>{children}</SpecInitialContext.Provider>;
}

export function useSpecInitial() {
  return useContext(SpecInitialContext);
}
