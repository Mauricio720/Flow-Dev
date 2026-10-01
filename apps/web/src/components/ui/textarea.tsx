import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content min-h-16 w-full rounded-md border border-input bg-surface px-3 py-2 text-[15px] leading-relaxed text-ink outline-none transition-colors duration-200 ease-out-expo placeholder:text-ink-3 focus:border-ring disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
