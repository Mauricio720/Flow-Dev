import { Compozy } from "@compozy/client";
import { resolveCompozyBaseUrl } from "./compozyEndpoint";
import { translateCompozyError, type CompozyCallContext } from "./compozyErrorTranslation";
import { CompozyCallError } from "../../application/compozy/compozyErrors";

export const COMPOZY_CALL_TIMEOUT_MS = 10_000;
const CLIENT_ID = "flow-dev";

export type CompozyConnectionOptions = { baseUrl?: () => Promise<string>; timeoutMs?: number; fetch?: typeof fetch };

export class CompozyConnection {
  private cached: { baseUrl: string; client: Promise<Compozy> } | null = null;
  private readonly timeoutMs: number;

  constructor(private readonly options: CompozyConnectionOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? COMPOZY_CALL_TIMEOUT_MS;
  }

  async call<T>(context: CompozyCallContext, operation: (client: Compozy) => Promise<T>): Promise<T> {
    const startedAt = Date.now();
    try {
      return await operation(await this.client());
    } catch (error) {
      const translated = translateCompozyError(error, context);
      this.forgetOnUnavailable(translated);
      logCallFailure(context, translated, Date.now() - startedAt);
      throw translated;
    }
  }

  private async client() {
    const baseUrl = await (this.options.baseUrl ?? resolveCompozyBaseUrl)();
    if (this.cached?.baseUrl !== baseUrl) this.cached = { baseUrl, client: this.connect(baseUrl) };
    return this.cached.client;
  }

  private connect(baseUrl: string) {
    return Compozy.connect({ baseUrl, clientId: CLIENT_ID, timeoutMs: this.timeoutMs, fetch: timedFetch(this.options.fetch ?? fetch, this.timeoutMs) });
  }

  private forgetOnUnavailable(error: unknown) {
    if (error instanceof CompozyCallError && error.reason === "compozy_unavailable") this.cached = null;
  }
}

function timedFetch(transport: typeof fetch, timeoutMs: number): typeof fetch {
  return (input, init) => {
    const requestSignal = input instanceof Request ? input.signal : undefined;
    const signals = [AbortSignal.timeout(timeoutMs), init?.signal ?? undefined, requestSignal].filter((signal): signal is AbortSignal => Boolean(signal));
    return transport(input, { ...init, signal: AbortSignal.any(signals) });
  };
}

function logCallFailure(context: CompozyCallContext, error: unknown, durationMs: number) {
  const detail = error instanceof CompozyCallError ? error.detail : undefined;
  const code = error instanceof CompozyCallError ? error.reason : "unexpected";
  console.warn(JSON.stringify({ event: "compozy.call_failed", operation: context.operation, status: detail?.status ?? null, code, durationMs }));
}
