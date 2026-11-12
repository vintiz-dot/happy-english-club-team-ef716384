import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { useIvory } from "@/hooks/useIvory";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-md",
  {
    variants: {
      variant: {
        default: "bg-primary/90 text-primary-foreground hover:bg-primary shadow-sm border border-primary-foreground/10",
        secondary: "glass-sm bg-secondary/80 text-secondary-foreground hover:bg-secondary/90 shadow-sm",
        destructive: "bg-destructive/90 text-destructive-foreground hover:bg-destructive shadow-sm border border-destructive-foreground/10",
        outline: "glass-sm text-foreground border-border/50",
        // New names (Ivory system); outside it they fall back to the nearest old look.
        success: "glass-sm text-foreground border-border/50",
        warning: "glass-sm text-foreground border-border/50",
        brass: "glass-sm text-foreground border-border/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

// Ivory badge recipe (DESIGN_SYSTEM s.15): a label, not a button - no hover.
const ivoryBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-hec-caption font-medium",
  {
    variants: {
      variant: {
        default: "border-hec-action bg-hec-action text-hec-on-action",
        secondary: "border-hec-line bg-hec-sunken text-hec-ink-soft",
        destructive: "border-hec-danger/30 bg-hec-danger-tint text-hec-danger",
        outline: "border-hec-line bg-transparent text-hec-ink",
        success: "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf",
        warning: "border-hec-warn/30 bg-hec-warn-tint text-hec-warn",
        brass: "border-hec-brass/40 bg-transparent text-hec-brass",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  const ivory = useIvory();
  return <div className={cn((ivory ? ivoryBadgeVariants : badgeVariants)({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
