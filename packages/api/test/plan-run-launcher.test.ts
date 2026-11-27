import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskSessionPlanItems, taskTerminalSessions } from "../src/infra/database/schema";
import { createTerminalLauncher } from "../src/infra/terminalComposition";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { planRunOpenRequestKey } from "../src/application/services/plan-run/planRunRequestKeys";
import { SONNET_HIGH, seedStoredPlan, seedTaskSet } from "./plan-support";
import { closeTaskFixture } from "./task-api-support";
import { HARNESS_NOW } from "./terminal-harness";
import { readySetup } from "./terminal-open-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  vi.restoreAllMocks();
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const PROMPT = "Implemente docs/specs/login/task_01.md.";

async function planItemWorld() {
  const world = await readySetup();
  await seedTaskSet(world, { ids: ["task_01"] });
  const { items } = await seedStoredPlan(world, { items: [{ taskIds: ["task_01"], choice: SONNET_HIGH }] });
  const launcher = createTerminalLauncher(world.setup.database, { env: world.harness.env, context: world.harness.context, hostId: machineIdentity(), now: () => HARNESS_NOW, tools: { has: async () => true } });
  const requestKey = planRunOpenRequestKey({ runId: crypto.randomUUID(), itemId: items[0]!.id, resumeCount: 0 });
  const input = { actorId: world.setup.ownerId, taskId: world.setup.taskId, projectId: world.setup.project.id, requestKey, purpose: "plan_item" as const, planItemId: items[0]!.id, choice: SONNET_HIGH, prompt: PROMPT };
  return { world, item: items[0]!, launcher, input };
}

describe("SessionLauncher plan item sessions", () => {
  it("V-06a opens the plan session with its choice, the default permission and the clone of who ran the plan, as a normal start", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { world, item, launcher, input } = await planItemWorld();
    const launched = await launcher.launch(input);
    expect(launched).toMatchObject({ created: true, session: { purpose: "plan_item", planItemId: item.id, userId: world.setup.ownerId, permissionMode: "bypass", agent: "claude", model: "sonnet", effort: "high", checkoutPath: world.clone, hostId: machineIdentity() } });
    expect(await world.harness.context.readPrompt(launched.session.id)).toBe(PROMPT);
    const [row] = await world.setup.database.select().from(taskSessionPlanItems).where(eq(taskSessionPlanItems.id, item.id));
    expect(row).toMatchObject({ forcedBy: null, forcedAt: null });
    expect(info).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\[plan\\] item_started item=${item.id} session=${launched.session.id} agent=claude model=sonnet effort=high force=false`)));
  });

  it("V-06b opens a single session for the same plan run request key", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { world, launcher, input } = await planItemWorld();
    const first = await launcher.launch(input);
    const again = await launcher.launch(input);
    expect(again).toMatchObject({ created: false, session: { id: first.session.id } });
    expect(await world.setup.database.select().from(taskTerminalSessions)).toHaveLength(1);
  });
});
