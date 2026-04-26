import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Clay-style input: rounded oat border, white surface,
 * Roobert 16px text. Focus signaled by blue outline (Clay focus ring).
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-hairline bg-white px-3 py-2 font-sans text-base text-ink placeholder:text-caption transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-[rgb(20,110,245)] disabled:cursor-not-allowed disabled:opacity-50",
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
