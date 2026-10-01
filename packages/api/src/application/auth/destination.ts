const projectPath = /^\/projects\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function normalizeDestination(value: unknown) { if (typeof value !== "string") return "/projects"; if (value === "/projects" || projectPath.test(value)) return value; return "/projects"; }
