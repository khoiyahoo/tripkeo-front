import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-transparent px-3 py-1 font-medium text-[12px] transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-0",
  {
    variants: {
      variant: {
        default: "bg-primary-500/16 text-primary-400 hover:bg-primary-500/24",
        secondary:
          "bg-secondary-400/16 text-secondary-200 hover:bg-secondary-400/24",
        destructive:
          "bg-destructive/16 text-destructive-foreground hover:bg-destructive/24",
        outline: "border-outline-variant bg-transparent text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
