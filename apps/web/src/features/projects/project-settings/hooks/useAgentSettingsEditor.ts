"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { expiredSessionPath, projectSettingsPath } from "@/lib/navigation/projectRoutes";
import { TRPC_BAD_REQUEST, TRPC_CONFLICT, TRPC_FORBIDDEN, TRPC_UNAUTHORIZED, type AgentCatalog, type AgentSettingView } from "@/lib/projects/contract";
import { trpc } from "@/lib/trpc/client";
import { trpcCode } from "@/lib/trpc/error";
import { CONFLICT_MESSAGE, FORBIDDEN_MESSAGE, GENERIC_MESSAGE, INVALID_MESSAGE } from "../agentSettingsCopy";

type Status = "editing" | "saving" | "saved";
export type AgentDraft = Pick<AgentSettingView, "provider" | "model" | "effort">;

const FAILURE_MESSAGE: Record<string, string> = { [TRPC_CONFLICT]: CONFLICT_MESSAGE, [TRPC_BAD_REQUEST]: INVALID_MESSAGE, [TRPC_FORBIDDEN]: FORBIDDEN_MESSAGE };

function draftOf(view: AgentSettingView): AgentDraft {
  return { provider: view.provider, model: view.model, effort: view.effort };
}

export function useAgentSettingsEditor(projectId: string, initial: AgentSettingView, catalog: AgentCatalog) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(draftOf(initial));
  const [status, setStatus] = useState<Status>("editing");
  const [message, setMessage] = useState<string | null>(null);
  function change(next: Partial<AgentDraft>) {
    const provider = next.provider ?? draft.provider;
    const model = next.provider && next.provider !== draft.provider ? (catalog[provider]?.[0] ?? "") : (next.model ?? draft.model);
    setDraft({ provider, model, effort: next.effort ?? draft.effort });
    setStatus("editing");
    setMessage(null);
  }
  async function save() {
    if (status === "saving") return;
    setStatus("saving");
    setMessage(null);
    try {
      const updated = await trpc.projects.agentSettings.update.mutate({ projectId, agent: saved.agent, ...draft, expectedVersion: saved.version });
      setSaved(updated);
      setDraft(draftOf(updated));
      setStatus("saved");
    } catch (error) {
      setStatus("editing");
      const code = String(trpcCode(error));
      if (code === TRPC_UNAUTHORIZED) return router.replace(expiredSessionPath(projectSettingsPath(projectId)));
      setMessage(FAILURE_MESSAGE[code] ?? GENERIC_MESSAGE);
    }
  }
  return { saved, draft, status, message, change, save };
}
