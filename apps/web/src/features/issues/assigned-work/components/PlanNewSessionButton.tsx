import { Button } from "@/components/ui/button";
import { NEW_SESSION_LABEL } from "../planCopy";

export function PlanNewSessionButton({ onOpen }: { onOpen: (button: HTMLButtonElement) => void }) {
  return (
    <div>
      <Button type="button" size="sm" variant="secondary" onClick={(event) => onOpen(event.currentTarget)}>{NEW_SESSION_LABEL}</Button>
    </div>
  );
}
