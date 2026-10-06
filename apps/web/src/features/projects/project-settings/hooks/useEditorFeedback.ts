"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { expiredSessionPath, projectSettingsPath } from "@/lib/navigation/projectRoutes";
import { TRPC_UNAUTHORIZED, type Project } from "@/lib/projects/contract";
import { projectFailure, type ProjectFailure, type ProjectFieldErrors } from "@/lib/projects/projectFailure";
import { trpc } from "@/lib/trpc/client";

const VERSION_CONFLICT = "version";
const NAME_CONFLICT = "name";
const NAME_TAKEN: ProjectFieldErrors = { name: "Já existe um projeto com esse nome. O nome salvo continua o mesmo." };

export function useEditorFeedback(projectId: string) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<ProjectFieldErrors>({});
  const [failure, setFailure] = useState<ProjectFailure | null>(null);
  const [changed, setChanged] = useState<Project | null>(null);
  async function fail(error: unknown) {
    const reason = projectFailure(error);
    if (reason.code === TRPC_UNAUTHORIZED) return router.replace(expiredSessionPath(projectSettingsPath(projectId)));
    if (reason.conflict === NAME_CONFLICT) return setFieldErrors(NAME_TAKEN);
    setFieldErrors(reason.fieldErrors);
    setFailure(reason);
    if (reason.conflict === VERSION_CONFLICT) setChanged(await trpc.projects.byId.query({ projectId }).catch(() => null));
  }
  function showFieldErrors(errors: ProjectFieldErrors) {
    setFailure(null);
    setFieldErrors(errors);
  }
  function finishReview() {
    setChanged(null);
    setFailure(null);
  }
  return { fieldErrors, failure, changed, fail, showFieldErrors, finishReview };
}
