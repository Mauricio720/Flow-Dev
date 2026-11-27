import { afterEach, describe, expect, it } from "vitest";
import { planRunWorld, runRows, seedTwoSessionPlan, startInput } from "./plan-run-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("tasks.plan.run", () => {
  it("V-04h refuses a member who calls run.start and saves nothing", async () => {
    const world = await planRunWorld();
    await seedTwoSessionPlan(world);
    await world.setup.authorize(world.setup.readerId);
    const { actorId, ...input } = startInput(world);
    expect(actorId).toBe(world.setup.ownerId);
    await expect(world.planCallerFor(world.setup.readerId).run.start(input)).rejects.toMatchObject({ code: "FORBIDDEN", message: "Só a pessoa operadora da tarefa pode alterar o plano.", cause: { reason: "plan_control_denied" } });
    expect(await runRows(world)).toEqual([]);
  });

  it("V-04i shows the paused run, with who paused, to a member reading the plan, and null without a run", async () => {
    const world = await planRunWorld();
    await seedTwoSessionPlan(world);
    await world.setup.authorize(world.setup.readerId);
    const scope = { projectId: world.setup.project.id, taskId: world.setup.taskId };
    const member = world.planCallerFor(world.setup.readerId);
    expect((await member.get(scope)).run).toBeNull();
    const operator = world.planCallerFor(world.setup.ownerId);
    const { actorId, ...input } = startInput(world);
    expect(actorId).toBe(world.setup.ownerId);
    const started = await operator.run.start(input);
    await operator.run.pause({ ...scope, revision: started.revision });
    const [owner] = await world.setup.client`select name from users where id = ${world.setup.ownerId}`;
    expect((await member.get(scope)).run).toEqual({ state: "paused", reason: null, pausedBy: owner!.name, currentItemId: null, revision: 2 });
    await expect(operator.run.pause({ ...scope, revision: 9 })).resolves.toMatchObject({ state: "paused" });
    await expect(operator.run.resume({ ...scope, revision: 9 })).rejects.toMatchObject({ code: "CONFLICT", message: "A execução mudou em outra aba. Recarregue." });
  });
});
