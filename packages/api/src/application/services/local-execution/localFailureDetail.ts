export const FAILURE_DETAIL_MAX = 600;
export const UNSAFE_EGRESS_TEXT = /(?:\u001b|(?:^|\s)(?:\/home\/|\/Users\/|[A-Z]:\\Users\\)|https?:\/\/[^\s/@]+:[^\s/@]+@|(?:gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}))/i;

const TOKEN_PATTERN = /(?:gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|https?:\/\/[^\s/@]+:[^\s/@]+@)/gi;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]+/g;
const CHECKOUT_PLACEHOLDER = "[checkout local]";
const HOME_PLACEHOLDER = "~";
const REDACTED = "[redacted]";
const MIN_SECRET_LENGTH = 8;

export type DetailContext = { checkoutRoot?: string | null; home?: string | null; secrets?: string[] };

export function failureDetailOf(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  if (typeof error.cause === "string" && error.cause) return error.cause;
  const reason = "reason" in error && typeof error.reason === "string" ? error.reason : null;
  return reason && error.message && error.message !== reason ? error.message : null;
}

function withoutLocalPaths(value: string, context: DetailContext) {
  const withoutCheckout = context.checkoutRoot ? value.split(context.checkoutRoot).join(CHECKOUT_PLACEHOLDER) : value;
  return context.home ? withoutCheckout.split(context.home).join(HOME_PLACEHOLDER) : withoutCheckout;
}

function withoutSecrets(value: string, secrets: string[]) {
  const longestFirst = secrets.filter((secret) => secret.length >= MIN_SECRET_LENGTH).sort((first, second) => second.length - first.length);
  return longestFirst.reduce((text, secret) => text.split(secret).join(REDACTED), value.replace(TOKEN_PATTERN, REDACTED));
}

export function sanitizeFailureDetail(value: string | null | undefined, context: DetailContext = {}): string | null {
  if (!value) return null;
  const cleaned = withoutSecrets(withoutLocalPaths(value, context), context.secrets ?? []).replace(CONTROL_CHARACTERS, " ").trim();
  if (!cleaned || UNSAFE_EGRESS_TEXT.test(cleaned)) return null;
  return cleaned.slice(0, FAILURE_DETAIL_MAX);
}
