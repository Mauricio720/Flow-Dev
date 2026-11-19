import { join } from "node:path";
import { fixture } from "./fixture";
import { FakeCompozyGateway } from "./compozy-fake-gateway";
import { createGitRepository, temporaryDirectory } from "./git-repository-support";
import { createProjectCompozyService } from "../src/infra/compozyComposition";
import { ProjectCompozyController } from "../src/controllers/projectCompozyController";
import { createProjectCompozyRouter } from "../src/routers/projectCompozy";

export const PROJECT_REMOTE = "git@github.com:Acme/Private.git";
export const OTHER_REMOTE = "https://github.com/acme/outro.git";

export async function projectCompozyFixture() {
  const base = await fixture();
  const temporary = await temporaryDirectory();
  const gateway = new FakeCompozyGateway();
  const controller = new ProjectCompozyController(createProjectCompozyService(base.database, { gateway }));
  const caller = (userId: string) => createProjectCompozyRouter(controller).createCaller({ principal: { userId }, requestId: "integration" });
  const project = await base.project();
  await base.permissions.assign(base.member.id, project.id, base.admin.id);
  const repository = (name: string, options: Parameters<typeof createGitRepository>[1] = { remote: PROJECT_REMOTE }) => createGitRepository(join(temporary.directory, name), options);
  const close = async () => { await base.close(); await temporary.remove(); };
  const rows = () => base.client`SELECT * FROM project_compozy_bindings WHERE project_id = ${project.id}`;
  return { ...base, gateway, controller, caller, project, repository, rows, directory: temporary.directory, close };
}

export type ProjectCompozyFixture = Awaited<ReturnType<typeof projectCompozyFixture>>;
