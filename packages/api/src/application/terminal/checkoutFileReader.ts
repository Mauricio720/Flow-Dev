export type CheckoutFileFailure = "too_large" | "not_found" | "unreadable";

export type CheckoutRead =
  | { kind: "content"; relativePath: string; content: string; byteSize: number }
  | { kind: "outside" }
  | { kind: "failed"; relativePath: string; reason: CheckoutFileFailure };

export interface CheckoutFileReader {
  read(input: { checkoutPath: string; path: string }): Promise<CheckoutRead>;
}
