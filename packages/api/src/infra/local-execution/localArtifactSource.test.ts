import { describe, expect, it, vi } from "vitest";
import { splitArtifact } from "../../application/services/local-execution/localArtifacts";
import { LocalArtifactSource } from "./localArtifactSource";

const COMMAND_ID = "command-1";
const target = { machineId: "machine-1", linkId: "link-1", linkRevision: 1, checkoutHandle: "checkout-1" };
const localRun = (sessionId: string | null = COMMAND_ID) => ({ id: "run-1", taskId: "task-1", runtime: { sessionId }, snapshot: { kind: "create_spec", workspace: { kind: "local", target }, operatorId: "operator-1" } }) as never;
const eventsOf = (content: string) => splitArtifact({ path: "_spec.md", content }).map((payload, index) => ({ sequence: index + 2, kind: "artifact", payload, payloadHash: "hash" }));

function sourceWith(events: unknown[] | null) {
  const commandForActor = vi.fn(async () => (events ? { command: {}, events } : null));
  const fallback = { read: vi.fn(async () => [{ path: "_spec.md", content: "host" }]) };
  const source = new LocalArtifactSource({ local: { commandForActor } as never, flow: { taskContext: async () => ({ projectId: "project-1" }) } as never, fallback });
  return { source, commandForActor, fallback };
}

describe("LocalArtifactSource", () => {
  it("builds the package from the documents the connector reported for the run command", async () => {
    const activity = { sequence: 1, kind: "activity", payload: { summary: "working", relativeFiles: [] }, payloadHash: "hash" };
    const { source, commandForActor, fallback } = sourceWith([activity, ...eventsOf("# Spec local")]);
    expect(await source.read(localRun())).toEqual([{ path: "_spec.md", content: "# Spec local" }]);
    expect(commandForActor).toHaveBeenCalledWith({ actorId: "operator-1", projectId: "project-1", commandId: COMMAND_ID });
    expect(fallback.read).not.toHaveBeenCalled();
  });

  it("keeps reading host runs from the server workspace", async () => {
    const { source, commandForActor } = sourceWith([]);
    const hostRun = { id: "run-2", taskId: "task-1", runtime: { sessionId: null }, snapshot: { kind: "create_spec", workspace: { kind: "isolated" } } } as never;
    expect(await source.read(hostRun)).toEqual([{ path: "_spec.md", content: "host" }]);
    expect(commandForActor).not.toHaveBeenCalled();
  });

  it("fails the capture when the run command cannot be found", async () => {
    await expect(sourceWith(null).source.read(localRun())).rejects.toMatchObject({ reason: "command_unavailable" });
    await expect(sourceWith([]).source.read(localRun(null))).rejects.toMatchObject({ reason: "command_unavailable" });
  });

  it("leaves the agent working notes out of the package", async () => {
    const notes = splitArtifact({ path: "_inventory.md", content: "# Inventário" }).map((payload) => ({ sequence: 9, kind: "artifact", payload, payloadHash: "hash" }));
    const { source } = sourceWith([...eventsOf("# Spec local"), ...notes]);
    expect(await source.read(localRun())).toEqual([{ path: "_spec.md", content: "# Spec local" }]);
  });
});
