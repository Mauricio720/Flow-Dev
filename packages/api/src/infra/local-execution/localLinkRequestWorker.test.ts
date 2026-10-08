import { describe, expect, it, vi } from "vitest";
import { LocalLinkRequestWorker, type LinkRequestClaim, type LinkRequestSettlement } from "./localLinkRequestWorker";

const claim: LinkRequestClaim = { requestId: "40000000-0000-4000-8000-000000000001", projectId: "20000000-0000-4000-8000-000000000001", repositoryOwner: "flow", repositoryName: "web", expectedRevision: 0 };

function setup() {
  const deps = { claim: vi.fn(async (): Promise<LinkRequestClaim | null> => claim), pick: vi.fn(async () => "/home/dev/web"), link: vi.fn(async () => ({})), settle: vi.fn(async (_settlement: LinkRequestSettlement) => ({})) };
  return { deps, worker: new LocalLinkRequestWorker(deps) };
}

describe("LocalLinkRequestWorker", () => {
  it("links the folder chosen for a claimed request and reports success", async () => {
    const { deps, worker } = setup();
    await worker.tick();
    await worker.whenIdle();
    expect(deps.link).toHaveBeenCalledWith({ ...claim, path: "/home/dev/web" });
    expect(deps.settle).toHaveBeenCalledWith({ requestId: claim.requestId, outcome: "linked", reason: null });
  });
  it("does nothing when no request is waiting or the server cannot be reached", async () => {
    const { deps, worker } = setup();
    deps.claim.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("connector_unavailable"));
    await worker.tick();
    await worker.tick();
    expect(deps.pick).not.toHaveBeenCalled();
  });
  it("reports why the link failed without leaking the local path", async () => {
    const { deps, worker } = setup();
    deps.pick.mockRejectedValueOnce(new Error("folder_not_selected"));
    await worker.tick();
    await worker.whenIdle();
    deps.link.mockRejectedValueOnce(new Error("ENOENT: /home/dev/secret"));
    await worker.tick();
    await worker.whenIdle();
    expect(deps.settle.mock.calls.map(([settlement]) => settlement.reason)).toEqual(["folder_not_selected", "link_failed"]);
  });
  it("keeps a single folder dialog open at a time", async () => {
    const { deps, worker } = setup();
    let choose: (path: string) => void = () => {};
    deps.pick.mockImplementationOnce(() => new Promise<string>((resolve) => { choose = resolve; }));
    await worker.tick();
    await worker.tick();
    expect(deps.claim).toHaveBeenCalledOnce();
    choose("/home/dev/web");
    await worker.whenIdle();
    expect(deps.settle).toHaveBeenCalledOnce();
  });
});
