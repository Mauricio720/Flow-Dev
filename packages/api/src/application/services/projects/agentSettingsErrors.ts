export type AgentSettingsReason = "agent_settings_invalid" | "agent_settings_conflict";

export class AgentSettingsError extends Error {
  constructor(readonly reason: AgentSettingsReason) { super(reason); }
}

export class AgentSettingsInvalidError extends AgentSettingsError {
  constructor() { super("agent_settings_invalid"); }
}

export class StaleAgentSettingsError extends AgentSettingsError {
  constructor() { super("agent_settings_conflict"); }
}
