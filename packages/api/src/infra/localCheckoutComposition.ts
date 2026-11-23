import { LocalCheckoutController } from "../controllers/localCheckoutController";
import { LocalCheckoutService } from "../application/services/projects/localCheckoutService";
import { requireDatabase } from "./database/client";
import { DrizzleAccessDao } from "./database/dao/drizzleAccessDao";
import { DrizzleLocalCheckoutDao } from "./database/dao/projects/drizzleLocalCheckoutDao";
import { DrizzleProjectDao } from "./database/dao/projects/drizzleProjectDao";
import { ExecGitCheckoutInspector } from "./terminal/execGitCheckoutInspector";
import { ZenityFolderPicker } from "./terminal/zenityFolderPicker";

type Database = ReturnType<typeof requireDatabase>;

export function createLocalCheckoutService(database: Database) {
  return new LocalCheckoutService({ checkouts: new DrizzleLocalCheckoutDao(database), inspector: new ExecGitCheckoutInspector(), projects: new DrizzleProjectDao(database), permissions: new DrizzleAccessDao(database), picker: new ZenityFolderPicker() });
}

export function createProductionLocalCheckoutController() {
  return new LocalCheckoutController(createLocalCheckoutService(requireDatabase()));
}
