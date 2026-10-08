import type { FlowRun } from "./unifiedContract";

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const MOMENT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const CLOCK = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function formatted(format: Intl.DateTimeFormat, value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "horário indisponível" : format.format(date);
}

export const runMoment = (value: string) => formatted(MOMENT, value);
export const runClock = (value: string) => formatted(CLOCK, value);

export function elapsedLabel(run: FlowRun, now: number) {
  const requestedAt = Date.parse(run.createdAt);
  if (now === 0 && !run.finishedAt) return "menos de 1 s";
  const endedAt = run.finishedAt ? Date.parse(run.finishedAt) : now;
  if (!Number.isFinite(requestedAt) || !Number.isFinite(endedAt)) return "indisponível";
  const seconds = Math.floor(Math.max(0, endedAt - requestedAt) / 1000);
  if (seconds < SECONDS_PER_MINUTE) return `${seconds} s`;
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  if (minutes < MINUTES_PER_HOUR) return `${minutes} min`;
  return `${Math.floor(minutes / MINUTES_PER_HOUR)} h ${minutes % MINUTES_PER_HOUR} min`;
}

export function runLabel(run: FlowRun, labels: Record<string, string>) {
  return run.kind === "loop" ? `Loop ${run.loopName} ${run.loopVersion}` : labels[run.kind] ?? run.kind;
}
