import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Clay-style button system.
 * - Roobert 16px / 500 / -0.16px tracking (NOT uppercase by default)
 * - Multi-layer "pressed into clay" shadow
 * - Playful hover: rotateZ(-4deg) + translateY(-4px) + hard offset shadow (-7px 7px)
 * - Generous radius: 12px standard, 9999px pill, 4px ghost-outlined
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-medium tracking-[-0.16px] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:[transform:rotateZ(-4deg)_translateY(-4px)] hover:shadow-[-7px_7px_0_0_rgb(0_0_0)]",
  {
    variants: {
      variant: {
        // Primary — solid black on cream, Clay shadow → hard offset on hover
        default:
          "bg-black text-white border border-black rounded-xl shadow-[0px_1px_1px_rgb(0_0_0/0.10),inset_0px_-1px_1px_rgb(0_0_0/0.04),0px_-0.5px_1px_rgb(0_0_0/0.05)]",
        // Inverted = white solid CTA on colorful sections
        inverted:
          "bg-white text-black border border-[var(--color-hairline)] rounded-xl shadow-[0px_1px_1px_rgb(0_0_0/0.10),inset_0px_-1px_1px_rgb(0_0_0/0.04),0px_-0.5px_1px_rgb(0_0_0/0.05)] hover:bg-[var(--color-oat-light)]",
        destructive:
          "bg-[var(--color-pomegranate)] text-white border border-[var(--color-pomegranate)] rounded-xl shadow-[var(--shadow-clay)]",
        // Ghost outlined — Clay's subtle 4px-radius outlined variant
        outline:
          "bg-transparent text-foreground border border-[#717989] rounded-[4px]",
        secondary:
          "bg-[var(--color-oat-light)] text-foreground border border-[var(--color-hairline)] rounded-xl shadow-[var(--shadow-clay)]",
        // Ghost — transparent, no border
        ghost:
          "bg-transparent text-foreground rounded-xl",
        link:
          "bg-transparent text-foreground underline underline-offset-[3px] decoration-1 hover:text-link hover:!transform-none hover:!shadow-none",
        // Pill — Clay's signature pill CTA
        pill:
          "bg-black text-white rounded-full px-6 shadow-[0px_1px_1px_rgb(0_0_0/0.10),inset_0px_-1px_1px_rgb(0_0_0/0.04),0px_-0.5px_1px_rgb(0_0_0/0.05)]",
      },
      size: {
        default: "h-10 px-4 py-2 text-[16px] leading-[1.5]",
        sm: "h-8 px-3 text-[12.8px] leading-[1.5] tracking-[-0.128px]",
        lg: "h-12 px-6 text-[16px] leading-[1.5]",
        icon: "h-10 w-10 rounded-xl border border-[var(--color-hairline)] bg-white",
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
