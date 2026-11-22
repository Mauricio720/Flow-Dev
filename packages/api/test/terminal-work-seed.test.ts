import { afterEach, describe, expect, it } from "vitest";
import { fixture, type Fixture } from "./fixture";
import { DrizzleTerminalIssueImageDao } from "../src/infra/database/dao/terminal/drizzleTerminalIssueImageDao";
import { DrizzleTerminalSessionDao } from "../src/infra/database/dao/terminal/drizzleTerminalSessionDao";
import { IssueImageSelector } from "../src/application/services/terminal/issueImageSelector";
import { WorkSeed } from "../../../apps/web/e2e/fixtures/workSeed";

let state: Fixture | undefined;
afterEach(async () => {
  await state?.close();
  state = undefined;
});

describe("e2e WorkSeed", () => {
  it("seeds an approved, claimed work the terminal preflight accepts, and cleans it up completely", async () => {
    state = await fixture();
    const project = await state.project();
    const operator = { id: state.member.id, login: "member", githubId: "88", sessionToken: "token" };
    const seed = new WorkSeed(state.client);
    const work = await seed.approvedWork({ id: project.id, name: project.name, repository: "acme/private" }, operator);
    const approved = await new DrizzleTerminalSessionDao(state.database).approvedPlanning(work.taskId);
    expect(approved).toMatchObject({ route: "direct_execution", issue: { number: 42 } });
    const images = await new IssueImageSelector(new DrizzleTerminalIssueImageDao(state.database)).select(work.taskId, approved!.issue.body);
    expect(images.map((image) => [image.id, image.name, image.preselected])).toEqual([[work.imageId, "print do erro", true]]);
    await seed.cleanup();
    const remaining = await state.client`select (select count(*) from tasks) + (select count(*) from task_planning_decisions) + (select count(*) from task_images) as total`;
    expect(Number(remaining[0]!.total)).toBe(0);
    await state.client`delete from projects where id = ${project.id}`;
  });
});
