export function lazyController<T>(provided: T | undefined, create: () => T): () => T {
  let created: T | undefined;
  return () => provided ?? (created ??= create());
}
