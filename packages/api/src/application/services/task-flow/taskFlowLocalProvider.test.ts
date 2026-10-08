import { describe, expect, it } from "vitest";
import { TaskFlowError } from "./taskFlowErrors";
import { assertLocalProviderOwnership } from "./taskFlowAdmission";

describe("local provider ownership", () => {
  it("accepts only a machine connection owned by the operator and selected checkout machine", () => {
    const connection = { executionTarget: "machine", machineId: "machine-1", ownerUserId: "user-1" };
    expect(() => assertLocalProviderOwnership(new Map([["agent", { connection } as never]]), "machine-1", "user-1")).not.toThrow();
    for (const rejected of [
      { ...connection, executionTarget: "host" },
      { ...connection, machineId: "machine-2" },
      { ...connection, ownerUserId: "user-2" },
    ]) {
      expect(() => assertLocalProviderOwnership(new Map([["agent", { connection: rejected } as never]]), "machine-1", "user-1")).toThrowError(new TaskFlowError("connection_unavailable"));
    }
  });
});
