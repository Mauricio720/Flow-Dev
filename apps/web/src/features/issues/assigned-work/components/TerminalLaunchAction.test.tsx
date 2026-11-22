import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { approvedDetail, reviewDetail } from "@/test/tasks";
import type { PlanningActions } from "../hooks/usePlanningActions";
import { IDLE_COMMAND } from "../planningCommandState";
import { withOperatorPermissions } from "../planningPermissions";
import { PlanningStage } from "./PlanningStage";

const actions = () => ({ command: IDLE_COMMAND, draftRoute: null, setDraftRoute: vi.fn(), reconcile: vi.fn(), resend: vi.fn(), reviewed: vi.fn(), refresh: vi.fn(), dirty: false, approvalBlocked: false }) as unknown as PlanningActions;
const noop = () => {};
const ACTION = { name: "Abrir no terminal" };

describe("Abrir no terminal action", () => {
  it("V-09a shows the action to the operator once the planning is approved", () => {
    render(<PlanningStage detail={withOperatorPermissions(approvedDetail(undefined, false))} actions={actions()} onRefresh={noop} />);
    expect(screen.getByRole("button", ACTION)).toBeTruthy();
  });

  it("V-09a hides the action while a redone planning is still in review (B-01)", () => {
    render(<PlanningStage detail={withOperatorPermissions(reviewDetail())} actions={actions()} onRefresh={noop} />);
    expect(screen.queryByRole("button", ACTION)).toBeNull();
  });

  it("V-09a hides the action from a person who is not the operator", () => {
    render(<PlanningStage detail={approvedDetail(undefined, false)} actions={null} onRefresh={noop} />);
    expect(screen.queryByRole("button", ACTION)).toBeNull();
    render(<PlanningStage detail={approvedDetail(undefined, false)} actions={actions()} onRefresh={noop} />);
    expect(screen.queryByRole("button", ACTION)).toBeNull();
  });

  it("derives the permission from an approved decision only", () => {
    expect(withOperatorPermissions(approvedDetail(undefined, false)).planning.permissions.canOpenTerminal).toBe(true);
    expect(withOperatorPermissions(reviewDetail()).planning.permissions.canOpenTerminal).toBe(false);
  });
});
