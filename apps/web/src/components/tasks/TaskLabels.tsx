import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { taskLabelTone } from "./taskLabelTone";

const EMPTY_LABELS = "Sem labels.";

type Props = { labels: readonly string[]; className?: string };

export function TaskLabels({ labels, className }: Props) {
  if (!labels.length) return <p className={cn("text-sm text-ink-3", className)}>{EMPTY_LABELS}</p>;
  return (
    <ul aria-label="Labels" className={cn("flex flex-wrap gap-1.5", className)}>
      {labels.map((label) => <li key={label} className="flex"><Badge variant="label" className={taskLabelTone(label)}>{label}</Badge></li>)}
    </ul>
  );
}
