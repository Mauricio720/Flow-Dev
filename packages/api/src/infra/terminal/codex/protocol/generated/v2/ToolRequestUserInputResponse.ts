import type { ToolRequestUserInputAnswer } from "./ToolRequestUserInputAnswer";
export type ToolRequestUserInputResponse = { answers: { [key in string]?: ToolRequestUserInputAnswer }, };
