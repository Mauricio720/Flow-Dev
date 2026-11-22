export type CheckoutValidationCode = "checkout_path_invalid" | "checkout_not_found" | "checkout_not_git_root" | "checkout_remote_mismatch";

export type CheckoutValidationDetails = { path?: string; root?: string; remotes?: string[]; repository?: string };

export class CheckoutValidationError extends Error {
  constructor(readonly code: CheckoutValidationCode, readonly details: CheckoutValidationDetails = {}) {
    super(code);
  }
}

export class StaleLocalCheckoutError extends Error {
  readonly reason = "version_conflict";
}
