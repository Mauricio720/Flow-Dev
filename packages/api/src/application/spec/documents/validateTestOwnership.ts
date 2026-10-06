import type { IndexedTaskData, IndexedTestData, ReviewDiagnostic } from "./specDocumentTypes";

const blocking = (code: string, message: string): ReviewDiagnostic => ({ code, severity: "blocking", documentId: null, blockId: null, message });
const TASK_REQUIRED = "task-required";

export function validateTestOwnership(tests: IndexedTestData[], tasks: IndexedTaskData[], requireTaskOwners: boolean): ReviewDiagnostic[] {
  return tests.flatMap((test) => {
    if (!test.tier) return [blocking("missing_tier", `${test.id} não declara o nível de execução`)];
    if (test.tier !== TASK_REQUIRED) return test.gateOwner?.trim() ? [] : [blocking("unassigned_gate", `${test.id} não tem responsável pelo gate`)];
    if (!requireTaskOwners) return [];
    const owners = tasks.filter((task) => task.testIds.includes(test.id)).map((task) => task.id);
    if (owners.length === 0) return [blocking("unassigned_test", `${test.id} não está atribuído a nenhuma tarefa`)];
    if (owners.length > 1 || (test.ownerTaskId && test.ownerTaskId !== owners[0])) return [blocking("contradictory_test_owner", `${test.id} tem responsáveis contraditórios: ${owners.join(", ")}`)];
    return [];
  });
}
