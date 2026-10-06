export function trpcCode(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const data = trpcData(error);
  if (data && "code" in data) return data.code;
  return "code" in error ? error.code : undefined;
}

export function trpcData(error: unknown) {
  if (!error || typeof error !== "object" || !("data" in error)) return undefined;
  return error.data && typeof error.data === "object" ? error.data : undefined;
}
