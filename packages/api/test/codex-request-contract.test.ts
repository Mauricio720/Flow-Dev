import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { DrizzleSessionTimelineDao } from "../src/infra/database/dao/terminal/drizzleSessionTimelineDao";
import { DrizzleTerminalSessionDao } from "../src/infra/database/dao/terminal/drizzleTerminalSessionDao";
import { SessionTimelineReader } from "../src/application/services/terminal/sessionTimelineReader";
import { DrizzleSessionRequestDao } from "../src/infra/database/dao/terminal/drizzleSessionRequestDao";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { flowDevWorld, insertPendingRequest } from "./session-interaction-support";

afterEach(closeTaskFixture);

describe("Codex request persistence contract", () => {
  it("persists request kinds and exposes permission offers and scope in the shared timeline", async () => {
    const { setup, session } = await flowDevWorld();
    const requests = new DrizzleSessionRequestDao(setup.database);
    await insertPendingRequest({ setup, sessionId: session.id }, "permission");
    await requests.insertRequest({ sessionId: session.id, kind: "file_change", toolUseId: "codex-file-1", payload: { toolName: "fileChange", permissionKind: "file_change", title: "Alterar arquivos:", body: "+ arquivo", truncated: false, suggestedRule: null, suggestions: [], offers: ["allow", "allow_session", "deny"], alwaysScope: null } });
    await requests.insertRequest({ sessionId: session.id, kind: "extra_permission", toolUseId: "codex-extra-1", payload: { toolName: "network", permissionKind: "extra_permission", title: "Pedir permissão:", body: "rede", truncated: false, suggestedRule: null, suggestions: [], offers: ["allow", "deny"], alwaysScope: null } });
    const page = await new SessionTimelineReader(new DrizzleSessionTimelineDao(setup.database)).read({ sessionId: session.id, now: new Date("2026-11-23T15:00:00Z") });
    expect(page.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "permission", kind: "command", offers: ["allow", "allow_always", "deny"], alwaysScope: "project" }),
      expect.objectContaining({ type: "permission", kind: "file_change", offers: ["allow", "allow_session", "deny"], alwaysScope: null }),
      expect.objectContaining({ type: "permission", kind: "extra_permission", offers: ["allow", "deny"], alwaysScope: null }),
    ]));
  });

  it("preserves question ids and secret metadata while supplying legacy defaults", async () => {
    const { setup, session } = await flowDevWorld();
    await insertPendingRequest({ setup, sessionId: session.id }, "question", { questions: [{ id: "codex-q-1", question: "Qual valor?", header: "Valor", options: [{ label: "A", description: "" }], multiSelect: false, secret: true, allowOther: false }] });
    await insertPendingRequest({ setup, sessionId: session.id }, "question");
    const page = await new SessionTimelineReader(new DrizzleSessionTimelineDao(setup.database)).read({ sessionId: session.id, now: new Date("2026-11-23T15:00:00Z") });
    expect(page.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "question", questions: expect.arrayContaining([expect.objectContaining({ id: "codex-q-1", secret: true, allowOther: false })]) }),
      expect.objectContaining({ type: "question", questions: expect.arrayContaining([expect.objectContaining({ id: "Quem pode ver os comentários?", secret: false, allowOther: true })]) }),
    ]));
  });

  it("maps the existing Claude conversation column to the neutral alias and keeps its version nullable", async () => {
    const { setup, session } = await flowDevWorld();
    await setup.database.update(taskTerminalSessions).set({ claudeSessionId: "agent-session-existing" }).where(eq(taskTerminalSessions.id, session.id));
    const record = await new DrizzleTerminalSessionDao(setup.database).findById(session.id);
    expect(record).toMatchObject({ claudeSessionId: "agent-session-existing", agentSessionId: "agent-session-existing", agentVersion: null });
  });
});
