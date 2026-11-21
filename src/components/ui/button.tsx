import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useIvory } from "@/hooks/useIvory";
import { isClickBlocked, trackClickResult } from "@/lib/pendingClick";

// The old look, kept ONLY for the screens whose owners keep them outside the
// system (OUTSIDE_ROUTES in src/lib/ivoryScope.ts: the recorder and audit
// clips) and for print copies. Delete it when those are released.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 premium-click hover:scale-[1.02] active:scale-[0.98] active:brightness-95 active:transition-transform active:duration-100",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg backdrop-blur-xl",
        // Kept exactly as before the rollout: only the outside routes (audit clips) and print
        // copies read this string, and the owner keeps audit clips as it is today.
        destructive: "glass-sm bg-destructive/90 text-destructive-foreground hover:bg-destructive shadow-md hover:shadow-lg",
        outline: "glass-sm hover:bg-warmGray hover:text-royalGreen dark:hover:bg-warmGray-dark dark:hover:text-royalGreen-light shadow-sm hover:shadow-md",
        secondary: "glass-sm bg-secondary/80 text-secondary-foreground hover:bg-secondary shadow-sm hover:shadow-md",
        ghost: "hover:glass-sm hover:bg-warmGray hover:text-royalGreen dark:hover:bg-warmGray-dark dark:hover:text-royalGreen-light",
        link: "text-primary underline-offset-4 hover:underline",
        // New names (Ivory system); outside it they fall back to the nearest old look.
        quiet: "hover:glass-sm hover:bg-warmGray hover:text-royalGreen dark:hover:bg-warmGray-dark dark:hover:text-royalGreen-light",
        "destructive-quiet": "glass-sm text-destructive shadow-sm hover:shadow-md",
        brass: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg backdrop-blur-xl",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

// The Ivory recipe (docs/DESIGN_SYSTEM.md s.15). Every button is at least 44 px.
const ivoryButtonVariants = cva(
  `inline-flex min-h-hec-target min-w-hec-target items-center justify-center gap-2 whitespace-nowrap rounded-hec-md font-medium transition-colors duration-hec-1 ease-hec motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 ${FOCUS}`,
  {
    variants: {
      variant: {
        default: "bg-hec-action text-hec-on-action hover:bg-hec-action/90 active:bg-hec-action/80",
        destructive: "bg-hec-danger-fill text-hec-on-danger hover:bg-hec-danger-fill/90 active:bg-hec-danger-fill/75",
        outline: "border border-hec-line-strong bg-hec-raised text-hec-ink hover:bg-hec-sunken",
        secondary: "bg-hec-sunken text-hec-ink hover:bg-hec-line",
        ghost: "text-hec-ink hover:bg-hec-sunken",
        link: "min-w-0 text-hec-brass underline-offset-4 hover:underline",
        quiet: "text-hec-ink hover:bg-hec-sunken",
        "destructive-quiet": "border border-hec-danger bg-transparent text-hec-danger hover:bg-hec-danger-tint",
        brass: "bg-hec-brass-fill text-hec-on-brass hover:bg-hec-brass-fill/90",
      },
      size: {
        default: "px-4 py-2 text-hec-body",
        sm: "px-3 text-hec-small",
        lg: "px-6 text-hec-body",
        icon: "p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Busy state: spinner, aria-busy, disabled; the label stays so the width holds.
   *  Also automatic when onClick returns a promise (not for asChild / type=submit). */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, onClick, onMouseEnter, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const ivory = useIvory();
    const [pending, setPending] = React.useState(false);
    const inFlight = React.useRef(false);
    const mounted = React.useRef(true);
    React.useEffect(() => () => { mounted.current = false; }, []);
    // Sync handlers, submit buttons and asChild keep their old behaviour.
    const tracksPromise = !asChild && props.type !== "submit";
    const busy = pending || !!loading;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Play click sound
      if (typeof window !== 'undefined' && !disabled && !busy) {
        import('@/lib/soundManager').then(({ soundManager }) => {
          soundManager.play('click');
        });
      }
      if (inFlight.current || loading) { e.preventDefault(); return; }
      const result = onClick?.(e);
      if (tracksPromise) {
        trackClickResult(
          result,
          () => { inFlight.current = true; setPending(true); },
          () => { inFlight.current = false; if (mounted.current) setPending(false); },
        );
      }
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Play subtle hover sound
      if (typeof window !== 'undefined' && !disabled) {
        import('@/lib/soundManager').then(({ soundManager }) => {
          if (soundManager.getVolume() > 0.5) { // Only on higher volume settings
            soundManager.play('hover');
          }
        });
      }
      onMouseEnter?.(e);
    };

    return (
      <Comp
        className={cn((ivory ? ivoryButtonVariants : buttonVariants)({ variant, size, className }), busy && !asChild && "relative cursor-progress")}
        ref={ref}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        disabled={isClickBlocked({ busy: false, loading: !asChild && busy, disabled })}
        aria-busy={busy && !asChild ? true : undefined}
        {...props}
      >
        {busy && !asChild ? (
          <>
            <span className="invisible inline-flex items-center justify-center gap-2">{children}</span>
            <Loader2 aria-hidden className="absolute !size-4 motion-safe:animate-spin" />
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants, ivoryButtonVariants };
