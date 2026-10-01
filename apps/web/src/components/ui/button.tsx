import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,opacity,filter,transform] duration-200 ease-out-expo disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:translate-y-px",
        publish: "bg-merge text-on-merge shadow-raised hover:brightness-110 active:translate-y-px",
        secondary: "border border-line bg-secondary text-secondary-foreground hover:border-ink-3",
        outline: "border border-line bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "text-ink-3 hover:bg-accent hover:text-ink",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:translate-y-px",
        suggestion: "rounded-full border border-clarify/40 bg-clarify-wash text-clarify-ink hover:border-clarify",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-2.5",
        lg: "h-12 px-5 text-[15px]",
        icon: "size-9",
        "icon-sm": "size-8",
        chip: "h-auto px-3 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
