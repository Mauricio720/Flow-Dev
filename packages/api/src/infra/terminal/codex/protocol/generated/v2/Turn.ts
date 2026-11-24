import type { ThreadItem } from "./ThreadItem";
import type { TurnError } from "./TurnError";
import type { TurnItemsView } from "./TurnItemsView";
import type { TurnStatus } from "./TurnStatus";
export type Turn = {
id: string,
items: Array<ThreadItem>,
itemsView: TurnItemsView, status: TurnStatus,
error: TurnError | null,
startedAt: number | null,
completedAt: number | null,
durationMs: number | null, };
