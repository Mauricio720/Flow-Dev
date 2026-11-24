import type { SessionAgent } from "../application/terminal/sessionAgentCatalog";

export const REGISTERED_SESSION_AGENTS: ReadonlySet<SessionAgent> = new Set<SessionAgent>(["claude", "codex"]);
