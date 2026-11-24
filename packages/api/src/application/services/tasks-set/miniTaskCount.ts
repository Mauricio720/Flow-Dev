const SECTION_HEADING = "## Mini-tarefas";
const HEADING_PREFIX = "## ";
const ITEM_PATTERN = /^- \[( |x|X)\](?:\s|$)/;
const UNCHECKED_MARK = " ";

export type MiniTaskCount = { done: number; total: number };

export function countMiniTasks(body: string): MiniTaskCount {
  const count = { done: 0, total: 0 };
  let inSection = false;
  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith(HEADING_PREFIX)) inSection = line.trim() === SECTION_HEADING;
    const mark = inSection ? ITEM_PATTERN.exec(line)?.[1] : undefined;
    if (mark === undefined) continue;
    count.total += 1;
    if (mark !== UNCHECKED_MARK) count.done += 1;
  }
  return count;
}
