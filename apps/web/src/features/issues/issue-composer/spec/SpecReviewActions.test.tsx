import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HASH1, V1, V2, packageOf, snapshotOf } from "@/test/spec";
import { SpecReviewActions } from "./SpecReviewActions";

const base = { snapshot: snapshotOf(), stage: "prd" as const, viewed: packageOf(), canAct: true, commandBlocked: false, adjustmentText: "", onAdjustmentText: vi.fn(), onRequest: vi.fn() };
const approve = () => screen.getByRole<HTMLButtonElement>("button", { name: "Aprovar PRD" });

describe("SpecReviewActions", () => {
  it("UT-055 exposes Aprovar PRD to the author for the current complete V1", () => {
    render(<SpecReviewActions {...base} />);
    expect(approve().disabled).toBe(false);
    fireEvent.click(approve());
    expect(base.onRequest).toHaveBeenCalledWith({ action: "spec.approve", stage: "prd", packageId: V1, manifestHash: HASH1 });
  });

  it("UT-056 disables approval while non-blank adjustment text is unsent", () => {
    render(<SpecReviewActions {...base} adjustmentText="Mudar o prazo" />);
    expect(approve().disabled).toBe(true);
    expect(screen.getByText(/pedido de ajuste ainda não enviado/)).toBeTruthy();
  });

  it("IT-055 labels a replaced V1 historical and disables its approval", () => {
    const snapshot = snapshotOf({ stages: [{ stage: "prd", state: "review", currentAttemptId: null, currentPackageId: V2, approvedPackageId: null, approval: null }] as never });
    render(<SpecReviewActions {...base} snapshot={snapshot} />);
    expect(screen.getByText(/versão anterior/)).toBeTruthy();
    expect(approve().disabled).toBe(true);
  });

  it("IT-093 invents no per-page acknowledgement before approval is available", () => {
    render(<SpecReviewActions {...base} />);
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(approve().disabled).toBe(false);
  });

  it("sends a bounded adjustment for the exact viewed package and clears the draft", () => {
    const onAdjustmentText = vi.fn();
    const onRequest = vi.fn();
    render(<SpecReviewActions {...base} adjustmentText="Clarify retention" onAdjustmentText={onAdjustmentText} onRequest={onRequest} />);
    fireEvent.click(screen.getByRole("button", { name: "Pedir ajuste" }));
    expect(onRequest).toHaveBeenCalledWith({ action: "spec.adjust", stage: "prd", packageId: V1, manifestHash: HASH1, text: "Clarify retention" });
    expect(onAdjustmentText).toHaveBeenCalledWith("");
  });

  it("hides controls from readers and disables approval for incomplete or pending work", () => {
    const { rerender } = render(<SpecReviewActions {...base} canAct={false} />);
    expect(screen.queryByRole("button", { name: "Aprovar PRD" })).toBeNull();
    rerender(<SpecReviewActions {...base} viewed={packageOf({ captureState: "prepared" })} />);
    expect(approve().disabled).toBe(true);
    rerender(<SpecReviewActions {...base} commandBlocked />);
    expect(approve().disabled).toBe(true);
  });
});
