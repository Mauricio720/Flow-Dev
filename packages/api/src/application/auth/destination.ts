const CATALOG_PATH = "/projects";
const CREATION_PATH = "/projects/new";
const UUID_V4 = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const projectPath = new RegExp(`^/projects/(${UUID_V4})(/(issues(/${UUID_V4})?|settings))?$`, "i");

export function normalizeDestination(value: unknown) {
  if (typeof value !== "string") return CATALOG_PATH;
  if (value === CATALOG_PATH || value === CREATION_PATH || projectPath.test(value)) return value;
  return CATALOG_PATH;
}

export function destinationProjectId(destination: string) {
  return projectPath.exec(destination)?.[1] ?? null;
}
