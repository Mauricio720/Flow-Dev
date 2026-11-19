import type { CompozyGateway } from "../../compozy/compozyGateway";
import type { CheckoutInspector } from "../../git/checkoutInspector";
import { TaskError } from "../tasks/taskErrors";
import { evaluateCheckout, type CheckoutEvaluation, type CheckoutFailureCode, type RepositoryRef } from "./checkoutRules";

export type CheckoutVerification = { compozyWorkspaceId: string | null; state: "ready" | "invalid"; failureCode: CheckoutFailureCode | null; defaultBranch: string | null };

const INSPECTION_FAILURES: string[] = ["checkout_not_found", "checkout_not_git_root"];

export class CheckoutVerifier {
  constructor(private readonly inspector: CheckoutInspector, private readonly gateway: CompozyGateway) {}

  async verify(checkoutPath: string, repository: RepositoryRef): Promise<CheckoutVerification> {
    const evaluation = await this.evaluate(checkoutPath, repository);
    if (!evaluation.ready) return { compozyWorkspaceId: null, state: "invalid", failureCode: evaluation.failureCode, defaultBranch: evaluation.defaultBranch };
    const { workspaceId } = await this.gateway.resolveWorkspace(evaluation.root);
    return { compozyWorkspaceId: workspaceId, state: "ready", failureCode: null, defaultBranch: evaluation.defaultBranch };
  }

  private async evaluate(checkoutPath: string, repository: RepositoryRef): Promise<CheckoutEvaluation> {
    try {
      return evaluateCheckout(await this.inspector.inspect(checkoutPath), repository);
    } catch (error) {
      if (error instanceof TaskError && INSPECTION_FAILURES.includes(error.reason)) return { ready: false, failureCode: error.reason as CheckoutFailureCode, defaultBranch: null };
      throw error;
    }
  }
}
