import * as React from "react";

import { cn } from "@/lib/utils";
import { useIvory } from "@/hooks/useIvory";
import { IVORY_FIELD } from "@/components/ui/input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  const ivory = useIvory();
  return (
      <textarea
        className={cn(
          ivory
            ? `${IVORY_FIELD} min-h-[80px]`
            : "glass-sm flex min-h-[80px] w-full rounded-xl px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 hover:shadow-md",
          className,
        )}
        ref={ref}
        {...props}
      />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
