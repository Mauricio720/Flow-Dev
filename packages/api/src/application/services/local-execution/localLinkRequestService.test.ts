import { describe, expect, it, vi } from "vitest";
import type { LocalConnectorDao } from "../../database/dao/localConnectorDao";
import type { LinkRequestRecord, LocalLinkRequestDao } from "../../database/dao/localLinkRequestDao";
import { RepositoryNotFoundError } from "../../github/repositoryErrors";
import type { RepositoryAccessService } from "../projects/repositoryAccessService";
import { LocalLinkRequestService } from "./localLinkRequestService";

const OWNER = "10000000-0000-4000-8000-000000000001";
const PROJECT = "20000000-0000-4000-8000-000000000001";
const MACHINE = "30000000-0000-4000-8000-000000000001";
const REQUEST = "40000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-10-07T12:00:00.000Z");
const liveMachine = { id: MACHINE, ownerUserId: OWNER, revokedAt: null, lastHeartbeatAt: new Date(NOW.getTime() - 5_000), credentialExpiresAt: new Date(NOW.getTime() + 60_000) };
const pending: LinkRequestRecord = { id: REQUEST, ownerUserId: OWNER, projectId: PROJECT, machineId: null, expectedRevision: 0, state: "pending", reason: null, expiresAt: new Date(NOW.getTime() + 60_000) };
const machineCall = { token: "machine-token", protocolVersion: 1 };

function setup(machines: unknown[] = [liveMachine]) {
  const requests = { open: vi.fn(async (input) => ({ ...pending, ...input })), latest: vi.fn(async () => pending), claim: vi.fn(async () => ({ ...pending, state: "claimed" as const, machineId: MACHINE })), settle: vi.fn(async () => true) } satisfies LocalLinkRequestDao;
  const connector = { listMachines: vi.fn(async () => ({ items: machines, nextCursor: null })), currentProjectLink: vi.fn(async () => null), machineByCredentialHash: vi.fn(async () => liveMachine) };
  const repositories = { requirePersonalRead: vi.fn(async () => ({ githubId: "repo-17", nodeId: "R_17", owner: "flow", name: "web" })) };
  const deps = { requests, connector: connector as unknown as LocalConnectorDao, repositories: repositories as unknown as RepositoryAccessService };
  return { requests, connector, repositories, service: new LocalLinkRequestService(deps, () => NOW) };
}

describe("LocalLinkRequestService", () => {
  it("opens a request against the current link revision when a connector is online", async () => {
    const { service, requests, connector } = setup();
    connector.currentProjectLink.mockResolvedValueOnce({ revision: 3 } as never);
    await expect(service.open({ userId: OWNER }, PROJECT)).resolves.toEqual({ requestId: REQUEST, state: "pending", reason: null });
    expect(requests.open).toHaveBeenCalledWith({ ownerUserId: OWNER, projectId: PROJECT, expectedRevision: 3, expiresAt: new Date(NOW.getTime() + 5 * 60_000) });
  });
  it("refuses to open a request when no connector has reported recently", async () => {
    const stale = { ...liveMachine, lastHeartbeatAt: new Date(NOW.getTime() - 60_000) };
    const { service, requests } = setup([stale, { ...liveMachine, revokedAt: NOW }]);
    await expect(service.open({ userId: OWNER }, PROJECT)).rejects.toMatchObject({ reason: "connector_unavailable" });
    expect(requests.open).not.toHaveBeenCalled();
  });
  it("reports an unanswered request as expired", async () => {
    const { service, requests } = setup();
    requests.latest.mockResolvedValueOnce({ ...pending, expiresAt: NOW });
    await expect(service.latest({ userId: OWNER }, PROJECT)).resolves.toEqual({ requestId: REQUEST, state: "failed", reason: "request_expired" });
  });
  it("hands the claimed request to the connector with the repository it must match", async () => {
    const { service, requests } = setup();
    await expect(service.claim(machineCall)).resolves.toEqual({ request: { requestId: REQUEST, projectId: PROJECT, repositoryOwner: "flow", repositoryName: "web", expectedRevision: 0 } });
    expect(requests.claim).toHaveBeenCalledWith({ ownerUserId: OWNER, machineId: MACHINE, now: NOW });
  });
  it("fails the claimed request when the project is no longer readable", async () => {
    const { service, requests, repositories } = setup();
    repositories.requirePersonalRead.mockRejectedValueOnce(new RepositoryNotFoundError());
    await expect(service.claim(machineCall)).resolves.toEqual({ request: null });
    expect(requests.settle).toHaveBeenCalledWith({ requestId: REQUEST, machineId: MACHINE, state: "failed", reason: "project_unavailable" });
  });
  it("records the connector outcome and rejects unsafe reasons and unknown machines", async () => {
    const { service, requests, connector } = setup();
    await expect(service.settle({ ...machineCall, requestId: REQUEST, outcome: "failed", reason: "folder_not_selected" })).resolves.toEqual({ settled: true });
    await service.settle({ ...machineCall, requestId: REQUEST, outcome: "linked", reason: "ignored" });
    expect(requests.settle).toHaveBeenLastCalledWith({ requestId: REQUEST, machineId: MACHINE, state: "linked", reason: null });
    await expect(service.settle({ ...machineCall, requestId: REQUEST, outcome: "failed", reason: "/home/dev/secret" })).rejects.toMatchObject({ reason: "invalid_input" });
    connector.machineByCredentialHash.mockResolvedValueOnce(null as never);
    await expect(service.claim(machineCall)).rejects.toMatchObject({ reason: "machine_unauthorized" });
    await expect(service.claim({ ...machineCall, protocolVersion: 2 })).rejects.toMatchObject({ reason: "protocol_incompatible" });
  });
});
