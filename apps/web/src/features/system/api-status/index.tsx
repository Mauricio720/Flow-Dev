import { getServerCaller } from "@/lib/trpc/server";
import { HttpPing } from "./components/HttpPing";

export async function ApiStatus() {
  const health = await (await getServerCaller()).health.check();

  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-line p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-3">Server Component → caller direto</p>
        <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
          <span className="size-2 rounded-full bg-emerald-500" /> {health.status}
        </p>
        <dl className="mt-3 space-y-1 font-mono text-xs text-ink-2">
          <div>requestId: {health.requestId.slice(0, 8)}</div>
          <div>serverTime: {health.serverTime}</div>
        </dl>
      </div>
      <HttpPing />
    </section>
  );
}
