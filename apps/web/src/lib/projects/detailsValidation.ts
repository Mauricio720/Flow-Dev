import { projectDetailsSchema } from "@flow-dev/api/schemas/projectFields";
import type { ProjectFieldErrors } from "./projectFailure";

export type ProjectDetailsDraft = { name: string; description: string };
export type ValidatedDetails = { ok: true; name: string; description: string | null } | { ok: false; errors: ProjectFieldErrors };

export function validateDetails(draft: ProjectDetailsDraft): ValidatedDetails {
  const result = projectDetailsSchema.safeParse(draft);
  if (result.success) return { ok: true, name: result.data.name, description: result.data.description || null };
  const errors: ProjectFieldErrors = {};
  result.error.issues.forEach((issue) => {
    const field = issue.path[0];
    if ((field === "name" || field === "description") && !errors[field]) errors[field] = issue.message;
  });
  return { ok: false, errors };
}
