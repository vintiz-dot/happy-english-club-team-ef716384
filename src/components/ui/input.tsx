import * as React from "react";

import { cn } from "@/lib/utils";
import { useIvory } from "@/hooks/useIvory";

// Ivory field recipe (DESIGN_SYSTEM s.15): 44 px, 16 px text (no iOS zoom), 3:1 edge, brass focus outline.
export const IVORY_FIELD =
  "flex min-h-hec-target w-full rounded-hec-md border border-hec-line-strong bg-hec-raised px-3 py-2 text-hec-body text-hec-ink placeholder:text-hec-ink-faint file:border-0 file:bg-transparent file:text-hec-small file:font-medium file:text-hec-ink aria-[invalid=true]:border-hec-danger disabled:cursor-not-allowed disabled:bg-hec-sunken disabled:opacity-50 transition-colors duration-hec-1 ease-hec focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const ivory = useIvory();
    return (
      <input
        type={type}
        className={cn(
          ivory
            ? IVORY_FIELD
            : "glass-sm flex h-10 w-full rounded-xl px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 hover:shadow-md md:text-sm",
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
