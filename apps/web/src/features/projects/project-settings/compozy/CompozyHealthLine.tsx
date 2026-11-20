import { cn } from "@/lib/utils";
import type { CompozyHealth } from "./compozyContract";
import { healthCopy } from "./compozyCopy";

export function CompozyHealthLine({ compozy }: { compozy: CompozyHealth }) {
  const reachable = compozy.reachable && !!compozy.version;
  return <p className={cn("text-sm", reachable ? "text-ink-2" : "text-destructive")}>{healthCopy(reachable ? compozy.version : null)}</p>;
}
