export type PlanRunState = "running" | "paused" | "completed";

export type PlanRunRecord = {
  id: string;
  planId: string;
  taskId: string;
  projectId: string;
  hostId: string;
  startedBy: string;
  state: PlanRunState;
  pauseReason: string | null;
  pausedBy: string | null;
  pausedByName: string | null;
  currentItemId: string | null;
  currentSessionId: string | null;
  resumeCount: number;
  revision: number;
  requestKey: string;
};

export type NewPlanRun = { planId: string; hostId: string; startedBy: string; requestKey: string };
export type PlanRunRestart = { runId: string; revision: number; hostId: string; startedBy: string; requestKey: string };
export type PlanRunNext = { state: PlanRunState; pauseReason?: string | null; pausedBy?: string | null; startedBy?: string; currentItemId?: string | null; currentSessionId?: string | null; resumeCount?: number };
export type PlanRunTransition = { runId: string; revision: number; next: PlanRunNext };

export interface PlanRunDao {
  findByPlan(planId: string): Promise<PlanRunRecord | null>;
  findByRequestKey(actorId: string, requestKey: string): Promise<PlanRunRecord | null>;
  create(input: NewPlanRun): Promise<PlanRunRecord>;
  restart(input: PlanRunRestart): Promise<PlanRunRecord | null>;
  transition(input: PlanRunTransition): Promise<PlanRunRecord | null>;
}
