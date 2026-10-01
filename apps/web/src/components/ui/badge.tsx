import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors duration-200 ease-out-expo [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border-line font-normal text-ink-3",
        label: "border-line px-2.5 py-0.5 font-mono font-normal text-ink-2",
        project: "border-project/30 bg-project-wash text-project-ink",
        clarify: "bg-clarify-wash text-clarify-ink",
        "ref-project": "rounded-md bg-project-wash px-2 py-1 font-mono font-normal text-project-ink",
        "ref-github": "rounded-md bg-github-wash px-2 py-1 font-mono font-normal text-github-ink",
        destructive: "bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";
  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
