export type CheckoutInspection = { root: string; remotes: string[]; defaultBranch: string | null };

export interface CheckoutInspector {
  inspect(path: string): Promise<CheckoutInspection>;
}
