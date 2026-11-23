import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../apps/web/node_modules/server-only/index.js", () => ({}));
vi.mock("../../../apps/web/node_modules/next/server.js", async () => {
  const support = await import("./terminal-event-route-support");
  return { after: (callback: () => unknown) => support.afterCallbacks.push(callback) };
});
vi.mock("@flow-dev/api/server", async () => {
  const support = await import("./terminal-event-route-support");
  return { createProductionTerminalEventController: () => support.routeDelegate };
});

import { POST } from "../../../apps/web/src/app/api/terminal-sessions/events/route";
import { taskArtifactVersions } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { editOf, hook, skillOf } from "./terminal-event-support";
import { runAfterCallbacks, routeWorld } from "./terminal-event-route-support";
import { fingerprint, rowsOf } from "./terminal-open-support";
import { editWithSkill, versionsByPath, writeFileIn } from "./artifact-capture-support";

const FILES_IN_ONE_TURN = 20;
const CAPTURE_DEADLINE_MS = 5000;
const world = () => routeWorld(POST);
const stop = JSON.stringify(hook("Stop"));

afterEach(async () => {
  vi.restoreAllMocks();
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("artifact capture flow", () => {
  it("V-17b captures once per content when Stop and SessionEnd are captured in parallel", async () => {
    const w = await world();
    await writeFileIn(w.clone, "doc.md", "A");
    await editWithSkill({ send: w.send, clone: w.clone, skill: "spec-writer", path: "doc.md" });
    await Promise.all([w.controller.capture(w.sessionId, "stop"), w.controller.capture(w.sessionId, "session_end")]);
    expect((await versionsByPath(w))["doc.md"]).toHaveLength(1);
  });

  it("V-17i answers the Stop POST before the capture runs, and the version exists afterwards", async () => {
    const w = await world();
    await writeFileIn(w.clone, "doc.md", "A");
    await editWithSkill({ send: w.send, clone: w.clone, skill: "spec-writer", path: "doc.md" });
    expect((await w.post(stop)).status).toBe(204);
    expect(await w.setup.database.select().from(taskArtifactVersions)).toHaveLength(0);
    await runAfterCallbacks();
    expect(await w.setup.database.select().from(taskArtifactVersions)).toHaveLength(1);
  });

  it("V-17j creates the 20 versions of a turn within 5 seconds of the POST", async () => {
    const w = await world();
    await w.send(skillOf("spec-writer"));
    for (let index = 0; index < FILES_IN_ONE_TURN; index += 1) {
      await writeFileIn(w.clone, `docs/f${index}.md`, `conteudo ${index}`);
      await w.send(editOf(w.clone, `docs/f${index}.md`));
    }
    const start = performance.now();
    await w.post(stop);
    await runAfterCallbacks();
    expect(performance.now() - start).toBeLessThan(CAPTURE_DEADLINE_MS);
    expect(await w.setup.database.select().from(taskArtifactVersions)).toHaveLength(FILES_IN_ONE_TURN);
  });

  it("V-17l logs one [terminal] line with the counts and the failure reason, without any content", async () => {
    const w = await world();
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    for (const name of ["a.md", "b.md"]) await writeFileIn(w.clone, name, "SEGREDO-XYZ");
    for (const name of ["a.md", "b.md", "sumiu.md"]) await editWithSkill({ send: w.send, clone: w.clone, skill: "spec-writer", path: name });
    await w.controller.capture(w.sessionId, "stop");
    const lines = info.mock.calls.map((call) => String(call[0])).filter((line) => line.startsWith("[terminal] capture "));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(`sessionId=${w.sessionId}`);
    expect(lines[0]).toMatch(/files=3 created=2 failures=1 failureReasons=not_found/);
    expect(lines[0]).not.toContain("SEGREDO-XYZ");
  });

  it("V-20f and V-20g leave the task rows, the clone and GitHub untouched", async () => {
    const w = await world();
    await writeFileIn(w.clone, "docs/spec.md", "# Spec");
    await editWithSkill({ send: w.send, clone: w.clone, skill: "spec-writer", path: "docs/spec.md" });
    const rowsBefore = await rowsOf(w.setup);
    const cloneBefore = await fingerprint(w.clone);
    await w.post(stop);
    await runAfterCallbacks();
    expect(await w.setup.database.select().from(taskArtifactVersions)).toHaveLength(1);
    expect(await rowsOf(w.setup)).toBe(rowsBefore);
    expect(await fingerprint(w.clone)).toEqual(cloneBefore);
    expect(w.harness.githubWrites).toEqual([]);
  });
});
