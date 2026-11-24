type ManifestInput = { ids: string[]; edges?: Array<[string, string]> };

export function manifestWith(input: ManifestInput) {
  const nodes = input.ids.map((id) => `    - id: ${id}\n      file: ${id}.md`).join("\n");
  const edges = (input.edges ?? []).map(([from, to]) => `    - from: ${from}\n      to: ${to}`).join("\n");
  const edgesBlock = edges ? `  edges:\n${edges}\n` : "  edges: []\n";
  return `---\nschema_version: "compozy.tasks/v2"\nworkflow: demo\ngraph:\n  nodes:\n${nodes}\n${edgesBlock}---\n\n# Tarefas\n`;
}

export function taskIds(count: number) {
  return Array.from({ length: count }, (_, index) => `task_${String(index + 1).padStart(2, "0")}`);
}
