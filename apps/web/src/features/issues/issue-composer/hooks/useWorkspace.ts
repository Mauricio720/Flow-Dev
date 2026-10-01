"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { demoSessions } from "../data/demo-sessions";
import type { IssueDraft, Session, ThreadItem, ToolCall } from "../model";

type State = { sessions: Session[]; activeId: string };

type Action =
  | { type: "select"; id: string }
  | { type: "create"; session: Session }
  | { type: "append"; sessionId: string; item: ThreadItem }
  | { type: "patchItem"; sessionId: string; itemId: string; patch: (item: ThreadItem) => ThreadItem }
  | { type: "phase"; sessionId: string; phase: Session["phase"]; title?: string; branch?: string };

function updateSession(state: State, id: string, fn: (session: Session) => Session): State {
  return { ...state, sessions: state.sessions.map((session) => (session.id === id ? fn(session) : session)) };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "select":
      return { ...state, activeId: action.id };
    case "create":
      return { sessions: [action.session, ...state.sessions], activeId: action.session.id };
    case "append":
      return updateSession(state, action.sessionId, (s) => ({ ...s, items: [...s.items, action.item] }));
    case "patchItem":
      return updateSession(state, action.sessionId, (s) => ({
        ...s,
        items: s.items.map((item) => (item.id === action.itemId ? action.patch(item) : item)),
      }));
    case "phase":
      return updateSession(state, action.sessionId, (s) => ({
        ...s,
        phase: action.phase,
        title: action.title ?? s.title,
        branch: action.branch ?? s.branch,
      }));
  }
}

let counter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;
const now = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const STOPWORDS = new Set(["quero", "preciso", "adicionar", "criar", "para", "com", "que", "uma", "um", "the", "está", "tem", "de", "da", "do", "no", "na", "o", "a", "e", "em", "ao", "os", "as"]);

function keywords(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    .slice(0, 3)
    .join(" ");
}

function slug(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36);
}

function sentence(text: string, max = 72) {
  const first = text.trim().split(/(?<=[.!?])\s/)[0].replace(/[.!?]$/, "");
  const capped = first.charAt(0).toUpperCase() + first.slice(1);
  return capped.length > max ? `${capped.slice(0, max - 1).trimEnd()}…` : capped;
}

function scriptedCalls(intent: string): ToolCall[] {
  const query = keywords(intent) || "intenção";
  return [
    { id: uid("c"), tool: "searchProject", target: query, status: "done", result: "4 arquivos", ms: 196 },
    { id: uid("c"), tool: "readProjectFile", target: `src/features/${slug(query).split("-")[0] || "app"}/index.ts`, status: "done", result: "117 linhas", ms: 34 },
    { id: uid("c"), tool: "searchGitHubIssues", target: query, status: "done", result: "1 issue", ms: 382 },
    { id: uid("c"), tool: "getGitHubIssue", target: "#118", status: "done", result: "aberta", ms: 171 },
  ];
}

function draftFrom(intent: string, answer: string, calls: ToolCall[]): IssueDraft {
  const file = calls.find((call) => call.tool === "readProjectFile")?.target;
  return {
    title: sentence(intent),
    context: `Pedido original: "${intent.trim().replace(/[.!?]+$/, "")}". A issue #118 trata de um tema próximo e continua aberta.`,
    goal: `${sentence(answer, 160)}.`,
    criteria: [
      `${sentence(answer, 160)}`,
      "Teste automatizado reproduzindo o cenário descrito no pedido",
      ...(file ? [`Impacto revisado em \`${file}\``] : []),
    ],
    labels: ["triagem"],
    references: calls
      .filter((call) => call.tool === "readProjectFile" || call.tool === "getGitHubIssue")
      .map((call) => ({ label: call.target, source: call.tool === "getGitHubIssue" ? "github" : "project" })),
  };
}

export function useWorkspace() {
  const [state, dispatch] = useReducer(reducer, { sessions: demoSessions, activeId: demoSessions[0].id });
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const active = state.sessions.find((s) => s.id === state.activeId) ?? state.sessions[0];

  const runTools = useCallback(
    (sessionId: string, calls: ToolCall[], onDone: () => void) => {
      const itemId = uid("t");
      dispatch({ type: "append", sessionId, item: { id: itemId, kind: "tools", calls: [] } });
      let at = 350;
      calls.forEach((call) => {
        later(at, () =>
          dispatch({
            type: "patchItem",
            sessionId,
            itemId,
            patch: (item) => (item.kind === "tools" ? { ...item, calls: [...item.calls, { ...call, status: "running" }] } : item),
          }),
        );
        at += 450 + (call.ms ?? 200);
        later(at, () =>
          dispatch({
            type: "patchItem",
            sessionId,
            itemId,
            patch: (item) =>
              item.kind === "tools" ? { ...item, calls: item.calls.map((c) => (c.id === call.id ? call : c)) } : item,
          }),
        );
        at += 120;
      });
      later(at + 300, onDone);
    },
    [later],
  );

  const send = useCallback(
    (text: string) => {
      const session = active;
      const sessionId = session.id;
      dispatch({ type: "append", sessionId, item: { id: uid("u"), kind: "user", text, at: now() } });

      if (session.phase === "new") {
        dispatch({ type: "phase", sessionId, phase: "thinking", title: sentence(text, 40), branch: `issue/${slug(text)}` });
        runTools(sessionId, scriptedCalls(text), () => {
          dispatch({
            type: "append",
            sessionId,
            item: {
              id: uid("q"),
              kind: "clarify",
              at: now(),
              text: "Achei os arquivos relacionados e uma issue aberta parecida, a #118. Para o draft ficar preciso: qual é o comportamento esperado quando isso estiver pronto?",
              suggestions: [],
            },
          });
          dispatch({ type: "phase", sessionId, phase: "awaiting" });
        });
        return;
      }

      if (session.phase === "awaiting") {
        dispatch({ type: "phase", sessionId, phase: "thinking" });
        const intent = session.items.find((item) => item.kind === "user")?.text ?? text;
        const calls = session.items.flatMap((item) => (item.kind === "tools" ? item.calls : []));
        later(1100, () => {
          dispatch({
            type: "append",
            sessionId,
            item: { id: uid("a"), kind: "agent", at: now(), text: "Montei o draft com o que você respondeu. Revise e publique quando estiver pronto." },
          });
          dispatch({ type: "append", sessionId, item: { id: uid("d"), kind: "draft", status: "review", draft: draftFrom(intent, text, calls) } });
          dispatch({ type: "phase", sessionId, phase: "draft" });
        });
        return;
      }

      const draftItem = [...session.items].reverse().find((item) => item.kind === "draft");
      dispatch({ type: "phase", sessionId, phase: "thinking" });
      later(900, () => {
        if (draftItem?.kind === "draft" && draftItem.status === "review") {
          dispatch({
            type: "patchItem",
            sessionId,
            itemId: draftItem.id,
            patch: (item) => (item.kind === "draft" ? { ...item, draft: { ...item.draft, context: `${item.draft.context} ${text.trim()}` } } : item),
          });
          dispatch({ type: "append", sessionId, item: { id: uid("a"), kind: "agent", at: now(), text: "Incluí isso no contexto do draft." } });
          dispatch({ type: "phase", sessionId, phase: "draft" });
        } else {
          dispatch({
            type: "append",
            sessionId,
            item: { id: uid("a"), kind: "agent", at: now(), text: "Esta issue já foi publicada. Para outra mudança, comece uma nova intenção." },
          });
          dispatch({ type: "phase", sessionId, phase: "published" });
        }
      });
    },
    [active, later, runTools],
  );

  const updateDraft = useCallback(
    (itemId: string, draft: IssueDraft) =>
      dispatch({ type: "patchItem", sessionId: active.id, itemId, patch: (item) => (item.kind === "draft" ? { ...item, draft } : item) }),
    [active.id],
  );

  const publish = useCallback(
    (itemId: string) => {
      const sessionId = active.id;
      dispatch({ type: "patchItem", sessionId, itemId, patch: (item) => (item.kind === "draft" ? { ...item, status: "publishing" } : item) });
      later(1400, () => {
        dispatch({
          type: "patchItem",
          sessionId,
          itemId,
          patch: (item) => (item.kind === "draft" ? { ...item, status: "published", issueNumber: 148 } : item),
        });
        dispatch({ type: "phase", sessionId, phase: "published" });
      });
    },
    [active.id, later],
  );

  const create = useCallback(() => {
    const blank = state.sessions.find((s) => s.phase === "new");
    if (blank) return dispatch({ type: "select", id: blank.id });
    dispatch({ type: "create", session: { id: uid("s"), title: "Nova intenção", branch: "issue/…", phase: "new", items: [] } });
  }, [state.sessions]);

  const select = useCallback((id: string) => dispatch({ type: "select", id }), []);

  return { sessions: state.sessions, active, send, updateDraft, publish, create, select };
}
