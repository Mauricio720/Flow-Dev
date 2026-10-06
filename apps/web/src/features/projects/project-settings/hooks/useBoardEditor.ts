"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { expiredSessionPath, projectSettingsPath } from "@/lib/navigation/projectRoutes";
import { TRPC_UNAUTHORIZED, type Project } from "@/lib/projects/contract";
import { trpc } from "@/lib/trpc/client";
import { trpcCode } from "@/lib/trpc/error";
import { EMPTY_BOARD_URL, boardFailureCopy, needsBoardAuthorization } from "../boardCopy";

type BoardStatus = "editing" | "saving" | "saved";
type BoardFeedback = { message: string | null; needsAuthorization: boolean };
const NO_FEEDBACK: BoardFeedback = { message: null, needsAuthorization: false };

function useBoardFeedback(projectId: string) {
  const router = useRouter();
  const [feedback, setFeedback] = useState(NO_FEEDBACK);
  function fail(error: unknown) {
    const code = trpcCode(error);
    if (code === TRPC_UNAUTHORIZED) return router.replace(expiredSessionPath(projectSettingsPath(projectId)));
    setFeedback(needsBoardAuthorization(code) ? { message: null, needsAuthorization: true } : { message: boardFailureCopy(code), needsAuthorization: false });
  }
  return { feedback, fail, warn: (message: string) => setFeedback({ message, needsAuthorization: false }), clear: () => setFeedback(NO_FEEDBACK) };
}

function useBoardRequest(projectId: string, onSaved: (board: Project["board"]) => void, onFailure: (error: unknown) => void) {
  const router = useRouter();
  const [status, setStatus] = useState<BoardStatus>("editing");
  async function save(boardUrl: string | null) {
    setStatus("saving");
    try {
      onSaved((await trpc.projects.updateBoard.mutate({ projectId, boardUrl })).board);
      setStatus("saved");
      router.refresh();
    } catch (error) {
      setStatus("editing");
      onFailure(error);
    }
  }
  return { status, save, edit: () => setStatus("editing") };
}

export function useBoardEditor(project: Project) {
  const [board, setBoard] = useState(project.board);
  const [url, setUrl] = useState(project.board?.url ?? "");
  const notices = useBoardFeedback(project.id);
  function confirm(saved: Project["board"]) {
    setBoard(saved);
    setUrl(saved?.url ?? "");
  }
  const request = useBoardRequest(project.id, confirm, notices.fail);
  function send(boardUrl: string | null) {
    notices.clear();
    void request.save(boardUrl);
  }
  function submit() {
    if (request.status === "saving") return;
    const boardUrl = url.trim();
    if (!boardUrl) return notices.warn(EMPTY_BOARD_URL);
    send(boardUrl);
  }
  function change(value: string) {
    setUrl(value);
    request.edit();
    notices.clear();
  }
  return { board, url, status: request.status, feedback: notices.feedback, submit, change, unlink: () => send(null) };
}
