import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { codexSessionOf } from "@/test/execution";
import { SESSION_SCOPE, messageOf, permissionOf, questionOf, timelineOf } from "@/test/session";
import { SessionConversation } from "./SessionConversation";

const timeline = vi.mocked(trpc.tasks.session.timeline.query);
const PURPOSES = ["route", "generate_tasks", "plan_item"] as const;

describe("Codex session access", () => {
  it.each(PURPOSES)("V-51h lets a reader follow an active %s session without actions", async (purpose) => {
    timeline.mockResolvedValue(timelineOf({ status: "asking", canControl: false, entries: [messageOf(), questionOf(), permissionOf()] }));
    render(<SessionConversation scope={SESSION_SCOPE} session={codexSessionOf({ purpose, status: "asking" })} reader />);
    const conversation = await screen.findByRole("list", { name: "Conversa com Codex" });
    expect(within(conversation).getByText("Vou começar pela análise.")).toBeTruthy();
    expect(screen.getAllByText("Aguardando a pessoa operadora")).toHaveLength(3);
    expect(screen.getByText("Só quem abriu a sessão, enquanto for a operadora, pode responder.")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Pergunta do Codex" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Aprovação do Codex" })).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it.each(PURPOSES)("V-51h keeps an ended %s session readable without controls", async (purpose) => {
    timeline.mockResolvedValue(timelineOf({ status: "ended", canControl: true, entries: [messageOf()] }));
    render(<SessionConversation scope={SESSION_SCOPE} session={codexSessionOf({ purpose, status: "ended" })} reader={false} />);
    const conversation = await screen.findByRole("list", { name: "Conversa com Codex" });
    expect(within(conversation).getByText("Vou começar pela análise.")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(/só quem abriu/i)).toBeNull();
  });

  it("V-51h preserves composer and session controls for the authorized operator", async () => {
    timeline.mockResolvedValue(timelineOf({ status: "running", canControl: true, entries: [messageOf()] }));
    render(<SessionConversation scope={SESSION_SCOPE} session={codexSessionOf()} reader={false} />);
    expect(await screen.findByRole("textbox", { name: "Mensagem para Codex" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Interromper" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Encerrar" })).toBeTruthy();
    expect(screen.getByText("Codex", { selector: "span" })).toBeTruthy();
  });
});
