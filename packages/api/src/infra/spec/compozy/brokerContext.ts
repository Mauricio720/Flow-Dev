import type { CodexLoginDriver } from "./codexLoginDriver";
import type { CredentialHomes } from "./credentialHomes";
import type { LoginKind, LoginOperations } from "./loginOperations";

export type LoginDrivers = { codex: CodexLoginDriver; claude?: CodexLoginDriver };

export type BrokerContext = {
  homes: CredentialHomes;
  drivers: LoginDrivers;
  operations: LoginOperations;
  now: () => Date;
};

export function driverFor(context: BrokerContext, kind: LoginKind) {
  const driver = context.drivers[kind];
  if (!driver) throw new Error("setup_required");
  return driver;
}
