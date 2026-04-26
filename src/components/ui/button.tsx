import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * WIRED-style button system.
 * - Square corners (rounded-none) — except `icon` which is a true circle.
 * - 2px hard black border on primary/outline.
 * - Hover = full color inversion, 150ms color/bg only.
 * - Apercu (Inter) 16px / 700 / 0.3px tracking.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-bold uppercase tracking-[0.04em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ink disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary: white bg, black 2px border, inverts on hover
        default:
          "bg-paper text-ink border-2 border-ink hover:bg-ink hover:text-paper",
        // Inverted: black bg, white 2px border, inverts on hover
        inverted:
          "bg-ink text-paper border-2 border-ink hover:bg-paper hover:text-ink",
        destructive:
          "bg-paper text-destructive border-2 border-destructive hover:bg-destructive hover:text-paper",
        outline:
          "bg-paper text-ink border-2 border-ink hover:bg-ink hover:text-paper",
        secondary:
          "bg-muted text-ink border-2 border-ink hover:bg-ink hover:text-paper",
        // Editorial inline link — underlined, blue on hover
        ghost:
          "bg-transparent text-ink hover:text-link normal-case tracking-normal font-sans font-medium",
        link:
          "bg-transparent text-ink underline underline-offset-[3px] decoration-1 hover:text-link normal-case tracking-normal font-sans font-medium",
      },
      size: {
        default: "h-11 px-6 text-[13px] leading-none",
        sm: "h-9 px-4 text-[12px] leading-none",
        lg: "h-12 px-8 text-sm leading-none",
        // Round icon button — the ONLY non-square button shape
        icon: "h-10 w-10 rounded-full border border-caption hover:border-ink",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
