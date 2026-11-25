import { afterEach, describe, expect, it } from "vitest";
import { DrizzleSessionControlDao } from "../src/infra/database/dao/terminal/drizzleSessionControlDao";
import { caveatsPrompt } from "../src/application/services/review/reviewPrompts";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { cycleAtCurrentTime, request, tickUntil } from "./review-cycle-sessions-support";
import { continuationsOf, sessionsOf } from "./review-cycle-rounds-support";
import { caveatsRoundTwoWorld, REPORT_005, requestAction } from "./review-cycle-caveats-support";
import { FOLDER } from "./plan-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("ReviewCycleStep retry after a caveats fix", () => {
  it("REQ-025 sends the caveats message again to the same executor", async () => {
    const world = await caveatsRoundTwoWorld();
    const [, execute] = await sessionsOf(world);
    const content = caveatsPrompt({ folder: FOLDER, reportPath: REPORT_005 });
    await requestAction(world, "fix");
    await tickUntil(world, (current) => current.state === "executing");
    await new DrizzleSessionControlDao(world.setup.database).requestInterrupt(execute!.id, new Date());
    await tickUntil(world, (current) => current.state === "failed");
    await request(world, "retry");
    await cycleAtCurrentTime(world.worker);
    expect(await continuationsOf(world, execute!.id, content)).toHaveLength(2);
    expect(await sessionsOf(world)).toHaveLength(2);
  });
});
