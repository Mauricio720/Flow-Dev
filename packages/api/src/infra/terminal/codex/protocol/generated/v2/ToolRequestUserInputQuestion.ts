import type { ToolRequestUserInputOption } from "./ToolRequestUserInputOption";
export type ToolRequestUserInputQuestion = { id: string, header: string, question: string, isOther: boolean, isSecret: boolean, options: Array<ToolRequestUserInputOption> | null, };
