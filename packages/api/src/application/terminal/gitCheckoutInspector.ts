export type CheckoutInspection =
  | { kind: "missing" }
  | { kind: "not_repository" }
  | { kind: "subfolder"; root: string }
  | { kind: "repository"; root: string; remotes: string[]; branch: string | null; detachedSha: string | null; dirty: boolean };

export interface GitCheckoutInspector {
  inspect(path: string): Promise<CheckoutInspection>;
}
