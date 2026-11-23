import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { sessionOf } from "@/test/execution";
import { SESSION_SCOPE, eventEntryOf, messageOf, permissionOf, questionOf, timelineOf } from "@/test/session";
import { SessionConversation } from "./SessionConversation";

const timeline = vi.mocked(trpc.tasks.session.timeline.query);
const READ_ONLY = "Só quem abriu a sessão, enquanto for a operadora, pode responder.";

async function show(page: ReturnType<typeof timelineOf>, session = sessionOf({ runtime: "flow_dev", status: page.status }), reader = false) {
  timeline.mockResolvedValue(page);
  render(<SessionConversation scope={SESSION_SCOPE} session={session} reader={reader} />);
  await screen.findByRole("list", { name: "Conversa com o Claude" });
  await act(async () => undefined);
}

describe("SessionConversation", () => {
  it("V-28g gives the people who cannot control the session the conversation and the note, with no field, buttons or controls", async () => {
    await show(timelineOf({ status: "asking", canControl: false, entries: [messageOf(), questionOf(), permissionOf({ id: "p2" })] }));
    expect(screen.getByText("Vou começar pela análise.")).toBeTruthy();
    expect(screen.getByText(READ_ONLY)).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("V-28g keeps an ended session read-only for the person who opened it: conversation, no field, no controls, no note", async () => {
    await show(timelineOf({ status: "ended", canControl: true, entries: [messageOf(), messageOf({ id: "m2", role: "user", content: "Rode também o lint" })] }));
    expect(screen.getByText("Rode também o lint")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(READ_ONLY)).toBeNull();
  });

  it("shows the field and the controls to the person who controls an active session", async () => {
    await show(timelineOf({ status: "running", canControl: true, entries: [messageOf()] }));
    expect(screen.getByRole("textbox", { name: "Mensagem para o Claude" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Interromper" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Encerrar" })).toBeTruthy();
  });

  it("V-28i puts the entries in a polite live region, renders the Claude text as escaped Markdown, and marks the queue", async () => {
    await show(timelineOf({ entries: [messageOf({ content: "**Feito** <script>x</script>" }), messageOf({ id: "m2", role: "user", content: "Use o Button existente", queued: true }), eventEntryOf()] }));
    const list = screen.getByRole("list", { name: "Conversa com o Claude" });
    expect(list.getAttribute("aria-live")).toBe("polite");
    expect(within(list).getByText("Feito").tagName).toBe("STRONG");
    expect(list.querySelector("script")).toBeNull();
    expect(within(list).getByText(/<script>x<\/script>/)).toBeTruthy();
    expect(within(list).getByText("Na fila")).toBeTruthy();
    expect(within(list).getByText("Rodou: pnpm test")).toBeTruthy();
  });

  it("V-28e marks a message that was not delivered, and not as queued", async () => {
    await show(timelineOf({ status: "ended", entries: [messageOf({ id: "m9", role: "user", content: "Pode seguir", undelivered: true })] }));
    expect(screen.getByText("Não entregue")).toBeTruthy();
    expect(screen.queryByText("Na fila")).toBeNull();
  });

  it("V-28i shows the status labels Precisa de você and Interrompida from the timeline", async () => {
    await show(timelineOf({ status: "asking", entries: [] }));
    expect(screen.getByText("Precisa de você")).toBeTruthy();
  });

  it("V-28i shows Interrompida with the restart note from the conversation", async () => {
    await show(timelineOf({ status: "interrupted", entries: [messageOf({ id: "n1", role: "system", content: "Sessão interrompida às 14:32. Envie uma mensagem para retomar." })] }));
    expect(screen.getByText("Interrompida")).toBeTruthy();
    expect(screen.getByText("Sessão interrompida às 14:32. Envie uma mensagem para retomar.")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Mensagem para o Claude" })).toBeTruthy();
  });
});
