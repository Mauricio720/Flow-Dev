function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== "object") return value;
  const entries = Object.entries(value as Record<string, unknown>).sort(([first], [second]) => first.localeCompare(second));
  return Object.fromEntries(entries.map(([key, entry]) => [key, sortKeys(entry)]));
}

export function stableJson(value: unknown) {
  return JSON.stringify(sortKeys(value));
}
