import type { ConnectionRecord } from "../../database/dao/softwareDao";
import type { WorkspaceChoice } from "./flowContracts";
import { TaskFlowError } from "./taskFlowErrors";

const LOCAL_WORKSPACE = "local";

export function assertRuntimeWorkspaceCompatibility(connection: Pick<ConnectionRecord, "executionTarget">, workspaceKind: WorkspaceChoice["kind"]) {
  const expectedTarget = workspaceKind === LOCAL_WORKSPACE ? "machine" : "host";
  if ((connection.executionTarget ?? "host") !== expectedTarget) throw new TaskFlowError("runtime_workspace_mismatch");
}
