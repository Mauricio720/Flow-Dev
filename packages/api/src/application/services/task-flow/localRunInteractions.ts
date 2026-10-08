import type { RunRecord } from "../../database/dao/taskFlowDao";
import type { RunQuestion } from "../local-execution/localQuestions";

export type LocalAnswer = { interactionId: string; choiceIndex?: number; text?: string };

export interface LocalRunInteractions {
  questions(run: RunRecord): Promise<RunQuestion[]>;
  answer(run: RunRecord, input: LocalAnswer): Promise<void>;
}
