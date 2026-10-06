import { parsePlanningBaseUrl } from "../../application/planning/planningConfiguration";
import type { PlanningGateway } from "../../application/planning/planningGateway";
import type { PlanningDispatch } from "../../application/services/tasks/planningContracts";
import { PLANNING_REQUEST_DEADLINE_MS } from "../../application/services/tasks/planningWorkerRules";
import { TaskError } from "../../application/services/tasks/taskErrors";
import { toDevControlRequest } from "./devControlPlanningRequest";
import { parseEnvelope, readCappedBody } from "./planningResponse";

const PLANNING_PATH = "/flow-dev/planning/v1";
const HTTP_OK = 200;
type Fetcher = typeof fetch;

export class DevControlPlanningGateway implements PlanningGateway {
  constructor(private readonly baseUrl = process.env.PLANNING_BASE_URL, private readonly apiKey = process.env.PLANNING_API_KEY, private readonly fetcher: Fetcher = fetch, private readonly timeoutMs = PLANNING_REQUEST_DEADLINE_MS) {}

  async analyze(input: PlanningDispatch, signal: AbortSignal) {
    const baseUrl = parsePlanningBaseUrl(this.baseUrl);
    if (!this.apiKey) throw new TaskError("planning_unconfigured");
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, this.timeoutMs);
    const abort = () => controller.abort();
    signal.addEventListener("abort", abort, { once: true });
    try { return await this.exchange({ input, baseUrl }, controller.signal); }
    catch (error) { throw this.translate(error, timedOut, signal); }
    finally { clearTimeout(timer); signal.removeEventListener("abort", abort); }
  }

  private async exchange({ input, baseUrl }: { input: PlanningDispatch; baseUrl: URL }, signal: AbortSignal) {
    const headers = { authorization: `Bearer ${this.apiKey}`, "x-flow-context-capability": input.contextCapability, "content-type": "application/json", "idempotency-key": input.operationId };
    const response = await this.fetcher(new URL(PLANNING_PATH, baseUrl), { method: "POST", headers, body: JSON.stringify(toDevControlRequest(input)), signal, redirect: "error" }).catch((cause) => { throw new NetworkFailure(cause); });
    if (response.status !== HTTP_OK) throw statusFailure(response);
    return parseEnvelope(await readCappedBody(response), input);
  }

  private translate(error: unknown, timedOut: boolean, caller: AbortSignal) {
    if (error instanceof TaskError) return error;
    if (timedOut) return new TaskError("planning_timeout");
    if (caller.aborted) return new TaskError("stale_execution");
    return new TaskError("planning_provider_unavailable", undefined, error instanceof NetworkFailure ? undefined : error);
  }
}

class NetworkFailure extends Error {
  constructor(readonly original: unknown) { super("network"); }
}

function statusFailure(response: Response) {
  const { status } = response;
  if (status === 409 || status === 422) return new TaskError("planning_invalid_output");
  if (status === 400 || status === 413) return new TaskError("planning_input_limit");
  if (status === 401 || status === 403) return new TaskError("planning_unconfigured");
  if (status === 429) return new TaskError("planning_rate_limited", undefined, undefined, retryAfter(response));
  return new TaskError("planning_provider_unavailable");
}

function retryAfter(response: Response) {
  const header = response.headers.get("retry-after") ?? "";
  return /^\d+$/.test(header) ? Number(header) : undefined;
}
