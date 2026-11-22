import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state = { session: null as { user: { id: string }; session: { id: string } } | null, current: null as unknown as { upload: (...args: unknown[]) => unknown; remove: (...args: unknown[]) => unknown } };
  const controller = { upload: (...args: unknown[]) => state.current.upload(...args), remove: (...args: unknown[]) => state.current.remove(...args) };
  return Object.assign(state, { controller });
});

vi.mock("../../../apps/web/node_modules/server-only/index.js", () => ({}));
vi.mock("@/lib/auth/auth", () => ({ auth: { api: { getSession: vi.fn(async () => mocks.session) } } }));
vi.mock("@flow-dev/api/server", () => ({
  attachmentFailureOf: (error: unknown) => attachmentFailureOf(error),
  attachmentFailureMessage: (reason: string) => attachmentFailureMessage(reason),
  createProductionTerminalAttachmentController: () => mocks.controller,
}));

import { attachmentFailureMessage } from "../src/application/services/terminal/terminalAttachmentErrors";
import { TerminalAttachmentController, attachmentFailureOf } from "../src/controllers/terminalAttachmentController";
import { DELETE } from "../../../apps/web/src/app/api/terminal-attachments/[attachmentId]/route";
import { POST } from "../../../apps/web/src/app/api/terminal-attachments/route";
import { taskTerminalAttachments } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { terminalHarness } from "./terminal-harness";
import { approvedWork, cleanupTerminalFolders } from "./terminal-support";
import { ORIGIN, URL_BASE, deleteRequest, params, reasonOf, uploadRequest } from "./terminal-route-support";


afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

async function world() {
  const setup = await approvedWork();
  const harness = await terminalHarness(setup);
  mocks.current = new TerminalAttachmentController(harness.attachments);
  mocks.session = { user: { id: setup.ownerId }, session: { id: setup.sessionId } };
  return { setup, harness };
}

beforeEach(() => {
  process.env.BETTER_AUTH_URL = ORIGIN;
  mocks.session = null;
});

describe("terminal attachment HTTP routes", () => {
  it("V-12i answers 201 with the attachment summary and removes it with 204, row and file", async () => {
    const { setup } = await world();
    const created = await POST(uploadRequest(setup));
    expect(created.status).toBe(201);
    const body = await created.json() as { id: string; name: string; contentType: string; byteSize: number };
    expect(body).toMatchObject({ name: "nota.md", contentType: "text/markdown", byteSize: 8 });
    expect((await DELETE(deleteRequest(body.id), params(body.id))).status).toBe(204);
    expect(await setup.database.select().from(taskTerminalAttachments)).toHaveLength(0);
  });

  it("V-12i answers session_required without a session and origin_denied for another site", async () => {
    const { setup } = await world();
    mocks.session = null;
    const noSession = await POST(uploadRequest(setup));
    expect([noSession.status, (await reasonOf(noSession)).reason]).toEqual([401, "session_required"]);
    const otherOrigin = await POST(uploadRequest(setup, { origin: "https://evil.test" }));
    expect([otherOrigin.status, (await reasonOf(otherOrigin)).reason]).toEqual([403, "origin_denied"]);
    expect((await POST(uploadRequest(setup, { origin: null }))).status).toBe(403);
  });

  it("V-12i answers operator_required for a person who is not the operator", async () => {
    const { setup } = await world();
    await setup.authorize(setup.readerId);
    mocks.session = { user: { id: setup.readerId }, session: { id: setup.sessionId } };
    const response = await POST(uploadRequest(setup));
    expect([response.status, (await reasonOf(response)).reason]).toEqual([403, "operator_required"]);
  });

  it("V-12i refuses to delete another person's attachment and keeps it", async () => {
    const { setup } = await world();
    const created = await (await POST(uploadRequest(setup))).json() as { id: string };
    await setup.authorize(setup.readerId);
    mocks.session = { user: { id: setup.readerId }, session: { id: setup.sessionId } };
    const response = await DELETE(deleteRequest(created.id), params(created.id));
    expect([response.status, (await reasonOf(response)).reason]).toEqual([404, "attachment_missing"]);
    expect(await setup.database.select().from(taskTerminalAttachments)).toHaveLength(1);
  });

  it("carries the section 7.6 message for a rejected type and a duplicate", async () => {
    const { setup } = await world();
    const rejected = await POST(uploadRequest(setup, { name: "planilha.xlsx", content: "PK" }));
    expect([rejected.status, (await reasonOf(rejected)).message]).toEqual([415, "Tipo não aceito. Envie imagens (PNG, JPEG, GIF, WebP), PDF ou arquivos de texto."]);
    await POST(uploadRequest(setup));
    const duplicate = await POST(uploadRequest(setup, { name: "outra.md" }));
    expect([duplicate.status, (await reasonOf(duplicate)).message]).toEqual([409, "Este arquivo já está anexado."]);
  });

  it("refuses a request that declares a body over the limit before reading it", async () => {
    const { setup } = await world();
    const declared = new Request(URL_BASE, { method: "POST", headers: { origin: ORIGIN, "content-length": String(11 * 1024 * 1024) }, body: "pequeno" });
    const response = await POST(declared);
    expect([response.status, (await reasonOf(response)).message]).toEqual([413, "Arquivo maior que 10 MB."]);
  });
});
