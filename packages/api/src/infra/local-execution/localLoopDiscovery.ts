import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { CompozyControlGateway, LoopDefinition } from "../../application/software/compozyControlGateway";
import { publishableLoops } from "../../application/services/local-execution/localLoopCatalog";

const CATALOG_WORKSPACE = "loop-catalog";
const PRIVATE_DIRECTORY_MODE = 0o700;

/** Lists the Loops this machine's CompozyOS offers to a workspace; an unreadable catalog offers none. */
export async function discoverLocalLoops(gateway: Pick<CompozyControlGateway, "registerWorkspace" | "listLoops">, directory: string): Promise<LoopDefinition[]> {
  const rootDir = join(directory, CATALOG_WORKSPACE);
  await mkdir(rootDir, { recursive: true, mode: PRIVATE_DIRECTORY_MODE });
  const workspace = await gateway.registerWorkspace?.({ rootDir, name: CATALOG_WORKSPACE });
  if (!workspace?.ok) return [];
  const listed = await gateway.listLoops(workspace.value);
  return listed.ok ? publishableLoops(listed.value) : [];
}
