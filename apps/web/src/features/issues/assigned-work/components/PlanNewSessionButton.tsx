import { Button } from "@/components/ui/button";
import { NEW_SESSION_LABEL } from "../planCopy";

export function PlanNewSessionButton({ onAdd }: { onAdd: () => void }) {
  return (
    <div>
      <Button type="button" size="sm" variant="secondary" onClick={onAdd}>{NEW_SESSION_LABEL}</Button>
    </div>
  );
}
