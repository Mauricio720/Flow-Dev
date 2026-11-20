import { afterEach, describe, expect, it } from "vitest";
import { projectCompozyFixture, type ProjectCompozyFixture } from "./project-compozy-support";

let current: ProjectCompozyFixture | undefined;
afterEach(async () => { await current?.close(); current = undefined; });

const failure = (code: string, reason: string) => expect.objectContaining({ code, cause: expect.objectContaining({ reason }) });

describe("projectCompozy failures that store nothing", () => {
  it("IT-003 refuses to save while the daemon is unavailable", async () => {
    current = await projectCompozyFixture();
    current.gateway.unavailable = true;
    const path = await current.repository("app");
    await expect(current.caller(current.admin.id).save({ projectId: current.project.id, checkoutPath: path })).rejects.toEqual(failure("SERVICE_UNAVAILABLE", "compozy_unavailable"));
    expect(await current.rows()).toEqual([]);
  });

  it("IT-004 lets only one of two concurrent saves with the same revision win", async () => {
    current = await projectCompozyFixture();
    const admin = current.caller(current.admin.id);
    await admin.save({ projectId: current.project.id, checkoutPath: await current.repository("app") });
    const [first, second] = [await current.repository("first"), await current.repository("second")];
    let arrivals = 0;
    let release: () => void = () => {};
    const bothArrived = new Promise<void>((resolve) => { release = resolve; });
    current.gateway.beforeResolve = async () => { arrivals += 1; if (arrivals === 2) release(); await bothArrived; };
    const results = await Promise.allSettled([first, second].map((checkoutPath) => admin.save({ projectId: current!.project.id, checkoutPath, expectedRevision: 1 })));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({ reason: failure("CONFLICT", "binding_conflict") });
    expect((await current.rows())[0]).toMatchObject({ revision: 2 });
  });

  it("rejects a stale or missing revision before inspecting the checkout", async () => {
    current = await projectCompozyFixture();
    const admin = current.caller(current.admin.id);
    const path = await current.repository("app");
    await admin.save({ projectId: current.project.id, checkoutPath: path });
    await expect(admin.save({ projectId: current.project.id, checkoutPath: path })).rejects.toEqual(failure("CONFLICT", "binding_conflict"));
    await expect(admin.check({ projectId: current.project.id, expectedRevision: 9 })).rejects.toEqual(failure("CONFLICT", "binding_conflict"));
    expect(current.gateway.resolvedPaths).toHaveLength(1);
  });

  it("US-001 EC-1 and AC-3 reject relative paths and non admin writers", async () => {
    current = await projectCompozyFixture();
    const path = await current.repository("app");
    await expect(current.caller(current.admin.id).save({ projectId: current.project.id, checkoutPath: "projetos/app" })).rejects.toEqual(failure("BAD_REQUEST", "checkout_path_not_absolute"));
    await expect(current.caller(current.member.id).save({ projectId: current.project.id, checkoutPath: path })).rejects.toEqual(failure("FORBIDDEN", "forbidden"));
    await expect(current.caller(current.member.id).check({ projectId: current.project.id, expectedRevision: 1 })).rejects.toEqual(failure("FORBIDDEN", "forbidden"));
    expect(await current.rows()).toEqual([]);
  });
});
