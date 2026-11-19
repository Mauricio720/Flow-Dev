import type { CompozyGateway } from "../application/compozy/compozyGateway";
import type { CheckoutInspector } from "../application/git/checkoutInspector";
import { ProjectAccessService } from "../application/services/access/projectAccessService";
import { CheckoutVerifier } from "../application/services/project-compozy/checkoutVerifier";
import { ProjectCompozyService } from "../application/services/project-compozy/projectCompozyService";
import { ProjectCompozyController } from "../controllers/projectCompozyController";
import { CompozyHttpGateway } from "./compozy/compozyHttpGateway";
import { requireDatabase, type Database } from "./database/client";
import { DrizzleAccessDao } from "./database/dao/drizzleAccessDao";
import { DrizzleProjectCompozyBindingDao } from "./database/dao/project-compozy/drizzleProjectCompozyBindingDao";
import { DrizzleProjectDao } from "./database/dao/projects/drizzleProjectDao";
import { GitCheckoutInspector } from "./git/gitCheckoutInspector";

export type CompozyOverrides = { gateway?: CompozyGateway; inspector?: CheckoutInspector; clock?: () => Date };

let sharedGateway: CompozyGateway | undefined;

export function compozyGateway() {
  sharedGateway ??= new CompozyHttpGateway();
  return sharedGateway;
}

export function createProjectCompozyService(database: Database, overrides: CompozyOverrides = {}) {
  const gateway = overrides.gateway ?? compozyGateway();
  const permissions = new DrizzleAccessDao(database);
  const access = new ProjectAccessService(new DrizzleProjectDao(database), permissions);
  const verifier = new CheckoutVerifier(overrides.inspector ?? new GitCheckoutInspector(), gateway);
  return new ProjectCompozyService({ bindings: new DrizzleProjectCompozyBindingDao(database), access, permissions, verifier, gateway, clock: overrides.clock });
}

export function createProductionProjectCompozyController() {
  return new ProjectCompozyController(createProjectCompozyService(requireDatabase()));
}
