import type { SafeIdentity } from "../../../application/software/credentialBroker";
import type { CodexAccount } from "./codexLoginDriver";
import { fingerprintAccount } from "./credentialHomes";

const FALLBACK_IDENTITY_LABEL = "ChatGPT";

export function safeIdentity(account: CodexAccount): SafeIdentity {
  const [name = "", domain] = (account.email ?? "").split("@");
  const label = domain ? `${name.slice(0, 1)}***@${domain}` : FALLBACK_IDENTITY_LABEL;
  return { label, fingerprint: fingerprintAccount(account.accountId) };
}
