import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { initial, softwareFailure } from "@/test/software";
import { loadSoftware } from "./loadSoftware";

const caller = vi.hoisted(() => ({ software: { compozy: { get: vi.fn(), connections: vi.fn(), history: vi.fn() } } }));
const session = vi.hoisted(() => ({ getAuthSession: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/trpc/server", () => ({ getServerCaller: async () => caller }));
vi.mock("@/lib/auth/session", () => session);

function serve() {
  const data = initial();
  session.getAuthSession.mockResolvedValue({ user: { id: "u1" } });
  caller.software.compozy.get.mockResolvedValue(data.settings);
  caller.software.compozy.connections.mockResolvedValue(data.connections);
  caller.software.compozy.history.mockResolvedValue(data.history);
  return data;
}

describe("loadSoftware", () => {
  it("IT-005 and IT-006 return the same saved state on repeated loads", async () => {
    const data = serve();
    expect(await loadSoftware()).toEqual(JSON.parse(JSON.stringify(data)));
    expect(await loadSoftware()).toEqual(JSON.parse(JSON.stringify(data)));
  });

  it("IT-003 sends a missing session to sign-in before reading any setting", async () => {
    serve();
    session.getAuthSession.mockResolvedValue(null);
    await expect(loadSoftware()).rejects.toThrow("NEXT_REDIRECT /login?erro=sessao_expirada&next=%2Fadmin%2Fsoftware%2Fcompozy");
    expect(caller.software.compozy.get).not.toHaveBeenCalled();
    expect(vi.mocked(redirect)).toHaveBeenCalledOnce();
  });

  it("IT-004 redirects a non-administrator or a role lost mid-session to the catalog", async () => {
    serve();
    caller.software.compozy.get.mockRejectedValue(softwareFailure("FORBIDDEN", "admin_required"));
    await expect(loadSoftware()).rejects.toThrow("NEXT_REDIRECT /projects");
  });

  it("rethrows unexpected failures instead of rendering partial settings", async () => {
    serve();
    caller.software.compozy.history.mockRejectedValue(softwareFailure("INTERNAL_SERVER_ERROR"));
    await expect(loadSoftware()).rejects.toThrow("INTERNAL_SERVER_ERROR");
  });
});
