import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { detailWith, sessionOf } from "@/test/execution";
import { PlanningTimeline } from "./PlanningTimeline";

const waiting = () => detailWith([sessionOf({ status: "waiting" })]);

describe("PlanningTimeline execution entry", () => {
  it("tells the operator it is their turn", () => {
    render(<PlanningTimeline detail={waiting()} />);
    expect(screen.getByText(/Aguardando você/)).toBeTruthy();
  });

  it("tells a reader it is the operator's turn", () => {
    render(<PlanningTimeline detail={waiting()} reader />);
    expect(screen.getByText(/Aguardando a pessoa operadora/)).toBeTruthy();
    expect(screen.queryByText(/Aguardando você/)).toBeNull();
  });
});
