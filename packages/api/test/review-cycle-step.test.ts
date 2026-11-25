import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskArtifactVersions, taskArtifacts, taskReviewCycles, taskReviewRounds, taskTerminalSessions } from "../src/infra/database/schema";
import type { ScriptStep } from "../src/infra/terminal/scriptedSessionSteps";
import { reviewInitialPrompt } from "../src/application/services/review/reviewPrompts";
import { cycle } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { reviewCycleWorkerWorld } from "./review-cycle-world";
import { FOLDER } from "./plan-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("ReviewCycleStep", () => {
  it("V-05g opens the reviewer on the next tick and logs metadata without prompt or report content", async () => {
    const world = await reviewCycleWorkerWorld();
    await cycle(world.worker);
    expect(world.worker.log.entries.filter(({ event }) => event === "step_failed")).toEqual([]);
    const sessions = await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.reviewCycleId, world.reviewCycle.id));
    expect(sessions).toHaveLength(1);
    const session = sessions[0]!;
    expect(session).toMatchObject({ purpose: "review", reviewCycleId: world.reviewCycle.id, agent: "claude", model: "opus", effort: "max", status: "opening" });
    const prompt = reviewInitialPrompt({ folder: "docs/specs/login", partial: false });
    expect(await world.harness.context.readPrompt(session.id)).toBe(prompt);
    const [stored] = await world.setup.database.select().from(taskReviewCycles).where(eq(taskReviewCycles.id, world.reviewCycle.id));
    expect(stored).toMatchObject({ reviewSessionId: session.id, stepRole: "review", stepStartedAt: world.worker.clock.now() });
    const logs = world.worker.log.entries.filter(({ event }) => event.startsWith("[review]"));
    expect(logs.map(({ event, fields }) => [event, fields.cycleId, fields.taskId, fields.round, fields.role, fields.sessionId, fields.durationMs])).toEqual([["[review] cycle_started", world.reviewCycle.id, world.setup.taskId, 1, "review", null, 0], ["[review] step_opened", world.reviewCycle.id, world.setup.taskId, 1, "review", session.id, 0]]);
    expect(JSON.stringify(logs)).not.toContain(prompt);
    expect(JSON.stringify(logs)).not.toContain("relatório privado confidencial");
  });

  it("V-05h captures a new review report and records the review round", async () => {
    const world = await reviewCycleWorkerWorld(REVIEW_OUTPUT);
    await cycle(world.worker);
    const [session] = await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.reviewCycleId, world.reviewCycle.id));
    const stepStartedAt = world.worker.clock.now();
    world.worker.clock.advance(ONE_SECOND_MS);
    await cycle(world.worker);
    await cycle(world.worker);
    const [round] = await world.setup.database.select().from(taskReviewRounds).where(eq(taskReviewRounds.cycleId, world.reviewCycle.id));
    const [artifact] = await world.setup.database.select().from(taskArtifacts).where(eq(taskArtifacts.relativePath, REPORT_PATH));
    const [version] = await world.setup.database.select().from(taskArtifactVersions).where(eq(taskArtifactVersions.artifactId, artifact!.id));
    expect(version).toMatchObject({ content: REPORT_CONTENT, trigger: "stop" });
    expect(round).toMatchObject({ number: 1, verdict: "rejected", reportPath: REPORT_PATH, reportVersionId: version!.id, reviewSessionId: session!.id, reviewedAt: new Date(stepStartedAt.getTime() + ONE_SECOND_MS) });
    expect(world.worker.log.entries.map(({ event }) => event).filter((event) => event.startsWith("[review]"))).toContain("[review] stage_read");
  });

  it("V-05h records no round and does not advance the cycle when the review turn did not write the stage document", async () => {
    const world = await reviewCycleWorkerWorld([{ kind: "end_turn" }]);
    await cycle(world.worker);
    const [before] = await world.setup.database.select().from(taskReviewCycles).where(eq(taskReviewCycles.id, world.reviewCycle.id));
    world.worker.clock.advance(ONE_SECOND_MS);
    await cycle(world.worker);
    await cycle(world.worker);
    const [after] = await world.setup.database.select().from(taskReviewCycles).where(eq(taskReviewCycles.id, world.reviewCycle.id));
    expect(before).toMatchObject({ state: "reviewing" });
    expect(after).toMatchObject({ state: "failed", stepRole: "review", round: 1 });
    expect(await world.setup.database.select().from(taskReviewRounds).where(eq(taskReviewRounds.cycleId, world.reviewCycle.id))).toEqual([]);
  });
});

const ONE_SECOND_MS = 1_000;
const REPORT_PATH = `${FOLDER}/reviews/review-004.md`;
const REPORT_CONTENT = "# Relatório de revisão secreto";
const STAGE_CONTENT = `etapa: execute\nrelatorio: ${REPORT_PATH}\n`;
const REVIEW_OUTPUT: ScriptStep[] = [{ kind: "write_file", path: REPORT_PATH, content: REPORT_CONTENT }, { kind: "write_file", path: `${FOLDER}/reviews/etapa.md`, content: STAGE_CONTENT }, { kind: "end_turn" }];
