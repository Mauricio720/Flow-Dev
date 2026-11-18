type Entry<T> = { value: T; loadedAt: number };
type CacheInput<T> = { freshMs: number; maxStaleMs: number; load: (key: string) => Promise<T>; keep?: (value: T) => boolean; now?: () => number };

export const READ_PATH_WINDOW = { freshMs: 30_000, maxStaleMs: 10 * 60_000 };

export function staleWhileRevalidate<T>(input: CacheInput<T>) {
  const entries = new Map<string, Entry<T>>();
  const pending = new Map<string, Promise<T>>();
  const now = input.now ?? Date.now;
  const reload = (key: string) => {
    const inFlight = pending.get(key) ?? input.load(key).then((value) => {
      if (input.keep?.(value) ?? true) entries.set(key, { value, loadedAt: now() });
      return value;
    }).finally(() => pending.delete(key));
    pending.set(key, inFlight);
    return inFlight;
  };
  return (key: string): Promise<T> => {
    const entry = entries.get(key);
    const age = entry ? now() - entry.loadedAt : Number.POSITIVE_INFINITY;
    if (entry && age < input.freshMs) return Promise.resolve(entry.value);
    if (!entry || age >= input.maxStaleMs) return reload(key);
    void reload(key).catch(() => undefined);
    return Promise.resolve(entry.value);
  };
}
