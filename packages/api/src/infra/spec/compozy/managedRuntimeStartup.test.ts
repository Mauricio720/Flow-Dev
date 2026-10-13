import { describe, expect, it, vi } from "vitest";
import { ensureManagedRuntime } from "./managedRuntimeStartup";
import { controlFailure, controlOk } from "../../../application/software/controlErrors";

const ENVIRONMENT = { SOFTWARE_COMPOZY_SOCKET: "/private/compozy/daemon.sock" };
const READY = controlOk("v0.3.0-beta.29", "v0.3.0-beta.29");

describe("managed development runtime startup", () => {
  it("starts the configured daemon when its socket is unavailable and confirms readiness", async () => {
    const check = vi.fn().mockResolvedValueOnce(controlFailure("service_unavailable")).mockResolvedValueOnce(READY);
    const start = vi.fn(async () => undefined);
    await expect(ensureManagedRuntime(ENVIRONMENT, { check, start })).resolves.toBe(true);
    expect(start).toHaveBeenCalledWith(expect.objectContaining({ socketPath: ENVIRONMENT.SOFTWARE_COMPOZY_SOCKET }));
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("reuses a healthy daemon without starting another process", async () => {
    const start = vi.fn(async () => undefined);
    await ensureManagedRuntime(ENVIRONMENT, { check: async () => READY, start });
    expect(start).not.toHaveBeenCalled();
  });

  it("refuses an incompatible running runtime", async () => {
    const start = vi.fn(async () => undefined);
    await expect(ensureManagedRuntime(ENVIRONMENT, { check: async () => controlFailure("runtime_incompatible"), start })).rejects.toThrow("managed_runtime_incompatible");
    expect(start).not.toHaveBeenCalled();
  });

  it("fails when the daemon does not become reachable after starting", async () => {
    await expect(ensureManagedRuntime(ENVIRONMENT, { check: async () => controlFailure("service_unavailable"), start: async () => undefined })).rejects.toThrow("managed_runtime_unavailable");
  });

  it("allows development without a configured managed runtime", async () => {
    const check = vi.fn(async () => READY);
    await expect(ensureManagedRuntime({}, { check, start: async () => undefined })).resolves.toBe(false);
    expect(check).not.toHaveBeenCalled();
  });
});
