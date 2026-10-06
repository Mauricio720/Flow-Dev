import { trpcCode, trpcData } from "@/lib/trpc/error";

export type ProjectFieldErrors = { name?: string; description?: string };
export type ProjectFailure = { code: unknown; conflict?: string; existingProjectId?: string; fieldErrors: ProjectFieldErrors };

function textOf(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function firstMessage(messages: unknown) {
  return Array.isArray(messages) ? textOf(messages[0]) : undefined;
}

function fieldErrorsOf(data: object | undefined): ProjectFieldErrors {
  const zodError = data && "zodError" in data ? data.zodError : undefined;
  const fields = zodError && typeof zodError === "object" && "fieldErrors" in zodError ? zodError.fieldErrors : undefined;
  if (!fields || typeof fields !== "object") return {};
  return { name: firstMessage("name" in fields ? fields.name : undefined), description: firstMessage("description" in fields ? fields.description : undefined) };
}

export function projectFailure(error: unknown): ProjectFailure {
  const data = trpcData(error);
  return {
    code: trpcCode(error),
    conflict: textOf(data && "conflict" in data ? data.conflict : undefined),
    existingProjectId: textOf(data && "existingProjectId" in data ? data.existingProjectId : undefined),
    fieldErrors: fieldErrorsOf(data),
  };
}
