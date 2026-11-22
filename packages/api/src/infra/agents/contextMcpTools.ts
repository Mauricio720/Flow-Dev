import { z } from "zod";
import type { IssueContextRequest } from "../../application/github/scopedContextGateway";

const QUERY_MIN = 2;
const QUERY_MAX = 180;
const PATH_MAX = 240;
const MAX_READ_LINES = 300;
const query = z.string().trim().min(QUERY_MIN).max(QUERY_MAX);

const readFileSchema = z.object({
  path: z.string().trim().min(1).max(PATH_MAX),
  fromLine: z.number().int().positive(),
  toLine: z.number().int().positive(),
}).refine((value) => value.toLine >= value.fromLine && value.toLine - value.fromLine < MAX_READ_LINES);

export type ContextToolName = "searchProject" | "readProjectFile" | "searchGitHubIssues" | "getGitHubIssue";

export type ContextToolDefinition = {
  name: ContextToolName;
  description: string;
  schema: z.ZodObject;
  toRequest: (input: Record<string, unknown>) => IssueContextRequest;
};

export const CONTEXT_TOOLS: ContextToolDefinition[] = [
  {
    name: "searchProject",
    description: "Search the Flow Dev authorized project repository for relevant source evidence.",
    schema: z.object({ query }),
    toRequest: (input) => ({ tool: "searchProject", query: String(input.query) }),
  },
  {
    name: "readProjectFile",
    description: "Read a bounded range from a file in the Flow Dev authorized repository.",
    schema: readFileSchema as unknown as z.ZodObject,
    toRequest: (input) => ({ tool: "readProjectFile", path: String(input.path), fromLine: Number(input.fromLine), toLine: Number(input.toLine) }),
  },
  {
    name: "searchGitHubIssues",
    description: "Search Issues in the Flow Dev authorized repository.",
    schema: z.object({ query }),
    toRequest: (input) => ({ tool: "searchGitHubIssues", query: String(input.query) }),
  },
  {
    name: "getGitHubIssue",
    description: "Read an Issue from the Flow Dev authorized repository.",
    schema: z.object({ issueNumber: z.number().int().positive() }),
    toRequest: (input) => ({ tool: "getGitHubIssue", issueNumber: Number(input.issueNumber) }),
  },
];

export function parseContextToolInput(definition: ContextToolDefinition, input: unknown): IssueContextRequest | null {
  const parsed = definition.schema.safeParse(input);
  return parsed.success ? definition.toRequest(parsed.data as Record<string, unknown>) : null;
}
