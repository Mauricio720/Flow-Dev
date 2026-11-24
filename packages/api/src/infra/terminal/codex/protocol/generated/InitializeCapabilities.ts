import type { JsonValue } from "./serde_json/JsonValue";
export type InitializeCapabilities = {
explicitGatewayOauth?: boolean,
experimentalApi: boolean,
requestAttestation: boolean,
mcpServerOpenaiFormElicitation?: boolean,
optOutNotificationMethods?: Array<string> | null,
extensions?: { [key in string]?: JsonValue } | null, };
