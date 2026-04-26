import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * WIRED-style input: rectangular, 2px solid black border, 0 radius,
 * Inter (Apercu) 16px placeholder. Focus signaled by the caret only —
 * border stays black; we add a subtle outline for accessibility.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full border-2 border-ink bg-paper px-3 py-2 font-sans text-base text-ink placeholder:text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-link disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
