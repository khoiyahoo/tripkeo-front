import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary-500 text-white shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:bg-primary-400",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:bg-destructive/90",
        outline:
          "border border-outline-variant bg-transparent text-white hover:bg-surface-dim",
        secondary: "bg-surface-dim text-white hover:bg-neutral-700",
        ghost: "text-on-surface-variant hover:bg-surface-dim hover:text-white",
        link: "text-primary-400 underline-offset-4 hover:text-primary-300 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-3.5 py-2",
        lg: "h-12 px-6 py-3",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
