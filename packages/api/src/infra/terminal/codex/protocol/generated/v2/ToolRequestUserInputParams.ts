import type { ToolRequestUserInputQuestion } from "./ToolRequestUserInputQuestion";
export type ToolRequestUserInputParams = { threadId: string, turnId: string, itemId: string, questions: Array<ToolRequestUserInputQuestion>, isBlocking: boolean,
autoResolutionMs: number | null, };
