import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-input bg-surface px-3 py-2 text-[15px] text-ink outline-none transition-colors duration-200 ease-out-expo placeholder:text-ink-3 focus:border-ring disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
