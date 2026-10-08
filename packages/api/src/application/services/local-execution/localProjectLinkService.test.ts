import { describe, expect, it, vi } from "vitest";
import type { LocalConnectorDao, MachineRecord } from "../../database/dao/localConnectorDao";
import type { RepositoryAccessService } from "../projects/repositoryAccessService";
import { hashSecret } from "./localSecrets";
import { LocalProjectLinkService } from "./localProjectLinkService";

const OWNER = "10000000-0000-4000-8000-000000000001";
const PROJECT = "20000000-0000-4000-8000-000000000001";
const MACHINE = "30000000-0000-4000-8000-000000000001";
const machine: MachineRecord = { id: MACHINE, ownerUserId: OWNER, label: "Notebook", credentialHash: hashSecret("machine-token"), credentialGeneration: 1, credentialExpiresAt: new Date("2026-10-08T00:00:00.000Z"), pendingCredentialHash: null, pendingCredentialCiphertext: null, pendingCredentialGeneration: null, pendingCredentialExpiresAt: null, pendingCredentialRequestKey: null, previousCredentialHash: null, previousCredentialExpiresAt: null, protocolVersion: 1, capabilities: [], catalogRevision: 0, lastHeartbeatAt: new Date("2026-10-07T11:59:50.000Z"), lastHeartbeatRequestKey: null, lastHeartbeatPayloadHash: null, revokedAt: null, revocationRequestKey: null, revocationPayloadHash: null, revision: 1 };

function setup() {
  const dao = {
    machineByCredentialHash: vi.fn(async () => machine),
    publishProjectLink: vi.fn(async (input) => ({ ...input.descriptor, id: "40000000-0000-4000-8000-000000000001", ownerUserId: input.ownerUserId, projectId: input.projectId, revision: 1, readiness: "unknown", readyAt: null, lastRequestKey: input.requestKey, lastRequestPayloadHash: "hash", revokedAt: null })),
    currentProjectLink: vi.fn(async () => null),
    machineById: vi.fn(async () => machine),
    revokeProjectLink: vi.fn(async () => { throw new Error("unused"); }),
  } as unknown as LocalConnectorDao;
  const repositories = { requirePersonalRead: vi.fn(async () => ({ githubId: "repo-17", nodeId: "R_kgDO17", owner: "flow", name: "web", visibility: "private", archived: false })) } as unknown as RepositoryAccessService;
  return { dao, repositories, service: new LocalProjectLinkService(dao, repositories, () => new Date("2026-10-07T12:00:00.000Z")) };
}

const input = { token: "machine-token", protocolVersion: 1, projectId: PROJECT, checkoutHandle: "a".repeat(64), checkoutKey: "b".repeat(64), repositoryOwner: "Flow", repositoryName: "Web", safeLabel: "  Working copy  ", expectedRevision: 0, requestKey: "50000000-0000-4000-8000-000000000001" };

describe("LocalProjectLinkService", () => {
  it("UT-052 verifies repository identity and persists only opaque checkout metadata", async () => {
    const { dao, repositories, service } = setup();
    const result = await service.publish(input);
    expect(repositories.requirePersonalRead).toHaveBeenCalledWith({ userId: OWNER }, PROJECT);
    expect(dao.publishProjectLink).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: OWNER, projectId: PROJECT, expectedRevision: 0, requestKey: input.requestKey, descriptor: expect.objectContaining({ repositoryId: "repo-17", repositoryNodeId: "R_kgDO17", safeLabel: "Working copy" }) }));
    expect(JSON.stringify(result)).not.toMatch(/machine-token|\/home\/|[A-Z]:\\/);
  });

  it("UT-053 rejects a checkout from another canonical repository", async () => {
    const { dao, service } = setup();
    await expect(service.publish({ ...input, repositoryName: "another" })).rejects.toMatchObject({ reason: "repository_mismatch" });
    expect(dao.publishProjectLink).not.toHaveBeenCalled();
  });

  it("UT-055 hides a private link requested by another owner", async () => {
    const { dao, service } = setup();
    const result = await service.mine({ userId: "90000000-0000-4000-8000-000000000009" }, PROJECT);
    expect(result).toBeNull();
    expect(dao.currentProjectLink).toHaveBeenCalledWith({ ownerUserId: "90000000-0000-4000-8000-000000000009", projectId: PROJECT });
  });

  it("UT-056 uses the expected revision and leaves concurrent update arbitration to the CAS DAO", async () => {
    const { dao, service } = setup();
    await expect(service.publish({ ...input, expectedRevision: 2 })).resolves.toMatchObject({ revision: 1 });
    expect(dao.publishProjectLink).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 2 }));
    vi.mocked(dao.publishProjectLink).mockRejectedValueOnce(Object.assign(new Error("link_changed"), { reason: "link_changed" }));
    await expect(service.publish({ ...input, expectedRevision: 2, requestKey: "50000000-0000-4000-8000-000000000002" })).rejects.toMatchObject({ reason: "link_changed" });
  });

  it("UT-057 and UT-162 report a machine offline at the exact 30 second boundary without a checkout fallback", async () => {
    const { dao, service } = setup();
    const staleMachine = { ...machine, lastHeartbeatAt: new Date("2026-10-07T11:59:30.000Z") };
    vi.mocked(dao.currentProjectLink).mockResolvedValue({ id: "40000000-0000-4000-8000-000000000001", ownerUserId: OWNER, projectId: PROJECT, machineId: MACHINE, checkoutHandle: "opaque", checkoutKey: "opaque", repositoryId: "repo-17", repositoryNodeId: "R_kgDO17", safeLabel: "Working copy", revision: 1, readiness: "ready", readyAt: new Date(), lastRequestKey: null, lastRequestPayloadHash: null, revokedAt: null });
    vi.mocked(dao.machineById).mockResolvedValue(staleMachine);
    const result = await service.mine({ userId: OWNER }, PROJECT);
    expect(result).toMatchObject({ readiness: "blocked", readinessCode: "machine_offline" });
    expect(JSON.stringify(result)).not.toMatch(/checkout|opaque|\/home\//);
  });

  it("UT-058 selects the requested project link only", async () => {
    const { dao, service } = setup();
    await service.mine({ userId: OWNER }, PROJECT);
    expect(dao.currentProjectLink).toHaveBeenCalledTimes(1);
    expect(dao.currentProjectLink).toHaveBeenCalledWith({ ownerUserId: OWNER, projectId: PROJECT });
  });

  it("UT-114 rejects a link when verified repository identity changed despite the same displayed label", async () => {
    const { dao, service } = setup();
    vi.mocked(dao.currentProjectLink).mockResolvedValue({ id: "40000000-0000-4000-8000-000000000001", ownerUserId: OWNER, projectId: PROJECT, machineId: MACHINE, checkoutHandle: "opaque", checkoutKey: "opaque", repositoryId: "old-id", repositoryNodeId: "old-node", safeLabel: "Working copy", revision: 1, readiness: "ready", readyAt: new Date(), lastRequestKey: null, lastRequestPayloadHash: null, revokedAt: null });
    await expect(service.publish({ ...input, expectedRevision: 1, requestKey: "50000000-0000-4000-8000-000000000003" })).rejects.toMatchObject({ reason: "repository_mismatch" });
    expect(dao.publishProjectLink).not.toHaveBeenCalled();
  });

  it("UT-115 replays the same link request key and retains its original identity", async () => {
    const { dao, service } = setup();
    const first = await service.publish(input);
    const replay = await service.publish(input);
    expect(replay).toEqual(first);
    expect(dao.publishProjectLink).toHaveBeenCalledTimes(2);
    expect(dao.publishProjectLink).toHaveBeenNthCalledWith(2, expect.objectContaining({ requestKey: input.requestKey, expectedRevision: 0 }));
  });

  it("UT-079 scopes the visible link to the actor and never returns checkout handles or credentials", async () => {
    const { dao, repositories, service } = setup();
    const link = { id: "40000000-0000-4000-8000-000000000001", ownerUserId: OWNER, projectId: PROJECT, machineId: MACHINE, checkoutHandle: "a".repeat(64), checkoutKey: "b".repeat(64), repositoryId: "repo-17", repositoryNodeId: "R_kgDO17", safeLabel: "Working copy", revision: 4, readiness: "ready", readyAt: new Date(), lastRequestKey: null, lastRequestPayloadHash: null, revokedAt: null };
    vi.mocked(dao.currentProjectLink).mockResolvedValue(link);
    const result = await service.mine({ userId: OWNER }, PROJECT);
    expect(dao.currentProjectLink).toHaveBeenCalledWith({ ownerUserId: OWNER, projectId: PROJECT });
    expect(repositories.requirePersonalRead).toHaveBeenCalledWith({ userId: OWNER }, PROJECT);
    expect(result).toMatchObject({ linkId: link.id, revision: 4, machineLabel: "Notebook", readiness: "ready" });
    expect(JSON.stringify(result)).not.toMatch(/checkoutHandle|checkoutKey|repo-17|R_kgDO17/);
  });
});
