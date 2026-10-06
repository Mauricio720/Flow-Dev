import { Button } from "@/components/ui/button";
import { githubFailureCopy, needsAuthorization } from "../failureCopy";
import { AuthorizationGuidance } from "./AuthorizationGuidance";

type Props = { code: unknown; onRetry?: () => void };

export function GithubFailure({ code, onRetry }: Props) {
  if (needsAuthorization(code)) return <AuthorizationGuidance />;
  const copy = githubFailureCopy(code);
  return (
    <div role="alert" className="rounded-xl border border-line bg-raised px-5 py-5">
      <h3 className="text-[15px] font-semibold">{copy.title}</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-ink-2">{copy.detail}</p>
      {copy.retryable && onRetry && <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>Tentar novamente</Button>}
    </div>
  );
}
