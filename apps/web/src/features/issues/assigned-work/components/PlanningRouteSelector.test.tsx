import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlanningRouteSelector } from "./PlanningRouteSelector";

const noop = () => {};

describe("PlanningRouteSelector", () => {
  it("UT-062 exposes exactly the three routes and an explicit save", async () => {
    const onSave = vi.fn();
    render(<PlanningRouteSelector saved="tech_spec" busy={false} onChoose={noop} onSave={onSave} onCancel={noop} />);
    expect(screen.getAllByRole("radio").map((radio) => radio.closest("label")?.textContent?.split("A próxima")[0])).toEqual(["Execução direta", "Tech Spec", "PRD"]);
    await userEvent.click(screen.getByRole("radio", { name: /PRD/ }));
    expect(onSave).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Salvar rota" }));
    expect(onSave).toHaveBeenCalledWith("prd");
  });

  it("UT-063 shows validation feedback without a mutation when nothing is chosen", async () => {
    const onSave = vi.fn();
    render(<PlanningRouteSelector saved={null} busy={false} onChoose={noop} onSave={onSave} onCancel={noop} />);
    await userEvent.click(screen.getByRole("button", { name: "Salvar rota" }));
    expect(screen.getByRole("alert").textContent).toBe("Escolha uma rota antes de salvar.");
    expect(onSave).not.toHaveBeenCalled();
  });
});
