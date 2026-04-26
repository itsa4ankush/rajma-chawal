import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Raycast-style button system.
 * - Inter 16px / 600 / +0.3px tracking
 * - Hover transitions are opacity-based (0.7), not color swaps
 * - Multi-layer inset shadows simulate macOS-native depth
 * - Pill (default/cta) for primary actions, 6px radius for secondary
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-semibold tracking-[0.01em] transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary CTA — semi-transparent white pill, dark text, full white on hover
        default:
          "bg-[hsla(0,0%,100%,0.92)] text-[#18191a] rounded-full hover:bg-white hover:opacity-100 shadow-[var(--shadow-button)]",
        // Inverted — solid white pill (alias of default)
        inverted:
          "bg-white text-[#18191a] rounded-full hover:opacity-80 shadow-[var(--shadow-button)]",
        // Destructive — Raycast Red glow
        destructive:
          "bg-transparent text-foreground border border-[rgb(255_99_99_/_0.4)] rounded-md hover:opacity-70 shadow-[var(--glow-red)]",
        // Secondary — transparent with subtle white border, square 6px radius
        outline:
          "bg-transparent text-foreground border border-[rgb(255_255_255_/_0.10)] rounded-md hover:opacity-70 shadow-[0_7px_3px_rgb(0_0_0_/_0.03)]",
        secondary:
          "bg-[var(--color-surface-200)] text-foreground border border-[rgb(255_255_255_/_0.06)] rounded-md hover:opacity-70",
        // Ghost — gray text, brightens to white
        ghost:
          "bg-transparent text-caption rounded-full hover:text-foreground hover:opacity-100",
        link:
          "bg-transparent text-foreground underline underline-offset-[3px] decoration-1 hover:text-link hover:opacity-100",
      },
      size: {
        default: "h-10 px-5 text-[14px] leading-none",
        sm: "h-8 px-3 text-[13px] leading-none",
        lg: "h-12 px-7 text-[16px] leading-none",
        // Round icon button
        icon: "h-9 w-9 rounded-full border border-[rgb(255_255_255_/_0.08)] hover:opacity-70",
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
