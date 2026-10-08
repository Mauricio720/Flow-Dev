import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { mapLocalExecutionError } from "./localExecutionErrorMapper";

describe("mapLocalExecutionError", () => {
  it("UT-153 excludes private fields carried on an unknown runtime error", () => {
    let mapped: unknown;
    try { mapLocalExecutionError(Object.assign(new Error("unknown_failure"), { localPath: "/home/operator/private", token: "credential-canary", detail: { secret: "hidden" } })); }
    catch (error) { mapped = error; }
    expect(mapped).toBeInstanceOf(TRPCError);
    expect((mapped as Error).message).toBe("Não foi possível concluir a operação local");
    expect(JSON.stringify(mapped)).not.toMatch(/operator|credential-canary|hidden/);
  });
});
