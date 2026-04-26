import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Sentry-style button system.
 * - Rubik UPPERCASE 14px / 500–700 / +0.2px tracking
 * - Primary: muted purple (#79628c) with inset tactile shadow → elevated on hover
 * - Glass: frosted white translucent
 * - White solid: high-visibility CTA, hovers to Sentry purple
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans uppercase tracking-[0.2px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary — muted purple, tactile inset shadow, elevates on hover
        default:
          "bg-[#79628c] text-white border border-[#584674] font-bold rounded-[13px] shadow-[inset_0_1px_3px_0_rgb(0_0_0_/_0.10)] hover:shadow-[0_0.5rem_1.5rem_rgb(0_0_0_/_0.18)]",
        // Inverted = high-visibility white solid CTA → hovers to Sentry purple
        inverted:
          "bg-white text-[#1f1633] font-bold rounded-lg hover:bg-[#6a5fc1] hover:text-white",
        destructive:
          "bg-destructive text-destructive-foreground font-bold rounded-lg hover:opacity-90",
        // Glass — frosted white, translucent
        outline:
          "bg-white/[0.18] backdrop-blur-md text-white border border-white/10 font-medium rounded-xl shadow-[0_2px_8px_rgb(0_0_0_/_0.08)] hover:bg-[rgb(54_22_107_/_0.30)]",
        secondary:
          "bg-[var(--color-surface-200)] text-foreground border border-[var(--color-hairline)] font-medium rounded-lg hover:bg-[var(--violet-deep)]",
        // Ghost — no background, lights to Sentry purple
        ghost:
          "bg-transparent text-foreground rounded-lg font-medium hover:text-link normal-case tracking-normal",
        link:
          "bg-transparent text-foreground underline underline-offset-[3px] decoration-1 hover:text-link normal-case tracking-normal font-medium",
      },
      size: {
        default: "h-10 px-4 py-3 text-[14px] leading-tight",
        sm: "h-8 px-3 text-[12px] leading-tight",
        lg: "h-12 px-6 text-[14px] leading-tight",
        icon: "h-9 w-9 rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-200)]",
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
