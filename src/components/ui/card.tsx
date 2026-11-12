import * as React from "react";

import { cn } from "@/lib/utils";
import { useIvory } from "@/hooks/useIvory";

// Ivory card recipe (DESIGN_SYSTEM s.15): solid surface, hairline, one soft shadow, no lift on hover.
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  const ivory = useIvory();
  return (
    <div
      ref={ref}
      className={cn(
        ivory
          ? "rounded-hec-lg border border-hec-line bg-hec-surface text-hec-ink shadow-hec-1"
          : "glass rounded-xl text-card-foreground transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:-translate-y-0.5",
        className,
      )}
      {...props}
    />
  );
});
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const ivory = useIvory();
    return (
      <div ref={ref} className={cn(ivory ? "flex flex-col gap-2 p-4 sm:p-6" : "flex flex-col space-y-1.5 p-6", className)} {...props} />
    );
  },
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    const ivory = useIvory();
    return (
      <h3
        ref={ref}
        className={cn(
          ivory ? "font-display text-hec-h2 font-medium text-hec-ink" : "text-2xl font-semibold leading-none tracking-tight",
          className,
        )}
        {...props}
      />
    );
  },
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const ivory = useIvory();
    return (
      <p ref={ref} className={cn(ivory ? "text-hec-small text-hec-ink-soft" : "text-sm text-muted-foreground", className)} {...props} />
    );
  },
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const ivory = useIvory();
    return <div ref={ref} className={cn(ivory ? "p-4 pt-0 sm:p-6 sm:pt-0" : "p-6 pt-0", className)} {...props} />;
  },
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const ivory = useIvory();
    return (
      <div ref={ref} className={cn(ivory ? "flex items-center gap-2 p-4 pt-0 sm:p-6 sm:pt-0" : "flex items-center p-6 pt-0", className)} {...props} />
    );
  },
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
