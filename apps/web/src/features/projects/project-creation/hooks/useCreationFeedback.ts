"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PROJECT_CREATION_PATH, expiredSessionPath } from "@/lib/navigation/projectRoutes";
import { TRPC_UNAUTHORIZED } from "@/lib/projects/contract";
import { projectFailure, type ProjectFailure, type ProjectFieldErrors } from "@/lib/projects/projectFailure";

const NAME_CONFLICT = "name";
const NAME_TAKEN: ProjectFieldErrors = { name: "Já existe um projeto com esse nome. Escolha outro." };

export function useCreationFeedback() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<ProjectFieldErrors>({});
  const [failure, setFailure] = useState<ProjectFailure | null>(null);
  function fail(error: unknown) {
    const reason = projectFailure(error);
    if (reason.code === TRPC_UNAUTHORIZED) return router.replace(expiredSessionPath(PROJECT_CREATION_PATH));
    setFieldErrors(reason.conflict === NAME_CONFLICT ? NAME_TAKEN : reason.fieldErrors);
    setFailure(reason);
  }
  function showFieldErrors(errors: ProjectFieldErrors) {
    setFailure(null);
    setFieldErrors(errors);
  }
  return { fieldErrors, failure, fail, showFieldErrors };
}
