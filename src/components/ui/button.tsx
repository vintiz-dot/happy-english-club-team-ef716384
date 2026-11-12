import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { useIvory } from "@/hooks/useIvory";

// Today's look: used on every screen that is not yet in the Ivory system.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 premium-click hover:scale-[1.02] active:transition-transform active:duration-100",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg backdrop-blur-xl",
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
  `inline-flex min-h-hec-target min-w-hec-target items-center justify-center gap-2 whitespace-nowrap rounded-hec-md font-medium transition-colors duration-hec-1 ease-hec disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 ${FOCUS}`,
  {
    variants: {
      variant: {
        default: "bg-hec-action text-hec-on-action hover:bg-hec-action/90 active:bg-hec-action/80",
        destructive: "bg-hec-danger-fill text-hec-on-danger hover:bg-hec-danger-fill/90",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, onMouseEnter, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const ivory = useIvory();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Play click sound
      if (typeof window !== 'undefined' && !props.disabled) {
        import('@/lib/soundManager').then(({ soundManager }) => {
          soundManager.play('click');
        });
      }
      onClick?.(e);
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Play subtle hover sound
      if (typeof window !== 'undefined' && !props.disabled) {
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
        className={cn((ivory ? ivoryButtonVariants : buttonVariants)({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants, ivoryButtonVariants };
