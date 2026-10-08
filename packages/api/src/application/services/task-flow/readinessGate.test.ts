import { describe, expect, it } from "vitest";
import type { LayerReadiness, ReadinessLayer, ReadinessProjection } from "../../software/readiness";
import { assertReadyForStart, blockedLayer } from "./readinessGate";

const layer = (name: ReadinessLayer, state: LayerReadiness["state"] = "ready"): LayerReadiness => ({ layer: name, state, reasonCode: null });

function projection(overrides: Partial<Record<ReadinessLayer, LayerReadiness["state"]>> = {}, stale = false): ReadinessProjection {
  const layers = { application: layer("application", overrides.application), account: layer("account", overrides.account), runtime: layer("runtime", overrides.runtime), host: layer("host", overrides.host) };
  return { layers, checkedAt: new Date(), stale };
}

describe("readiness gate by execution target", () => {
  it("blocks a host run while the host runtime is unreachable", () => {
    const unreachable = projection({ runtime: "unknown" });
    expect(blockedLayer(unreachable)).toBe("runtime");
    expect(() => assertReadyForStart(unreachable)).toThrowError(expect.objectContaining({ reason: "runtime_incompatible" }));
    expect(() => assertReadyForStart(projection({}, true))).toThrowError(expect.objectContaining({ reason: "service_unavailable" }));
  });

  it("lets a machine run start without the host runtime, account or a fresh host probe", () => {
    const hostDown = projection({ runtime: "unknown", host: "blocked", account: "blocked" }, true);
    expect(blockedLayer(hostDown, "machine")).toBeNull();
    expect(() => assertReadyForStart(hostDown, "machine")).not.toThrow();
  });

  it("still requires the Software application to be enabled for a machine run", () => {
    expect(() => assertReadyForStart(projection({ application: "blocked" }), "machine")).toThrowError(expect.objectContaining({ reason: "software_not_enabled" }));
  });
});
