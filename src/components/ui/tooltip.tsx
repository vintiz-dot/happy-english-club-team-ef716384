import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

/**
 * Nova tooltip system
 * ====================
 * - Glass surface with an aurora hairline and inner top-light (.nova-tip)
 * - Spring pop anchored to the trigger (Radix transform-origin var), so
 *   tips feel physically attached instead of fading in from nowhere
 * - Snappy by default: 150ms first-hover, near-instant when the pointer
 *   moves between tips (skipDelayDuration)
 * - RichTooltipContent: icon + title + description + keyboard shortcut
 *   for live-teaching surfaces that need data, not just a label
 */

const TooltipProvider = ({
  delayDuration = 150,
  skipDelayDuration = 250,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) => (
  <TooltipPrimitive.Provider
    delayDuration={delayDuration}
    skipDelayDuration={skipDelayDuration}
    {...props}
  />
);

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  container?: HTMLElement | null;
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, sideOffset = 6, container, ...props }, ref) => {
  const portalContainer =
    container ?? (document.fullscreenElement as HTMLElement) ?? undefined;
  return (
    <TooltipPrimitive.Portal container={portalContainer}>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "nova-tip z-[9999] rounded-xl px-3 py-1.5 text-xs font-medium",
          "bg-popover/85 backdrop-blur-2xl text-popover-foreground",
          "ring-1 ring-border/60",
          "shadow-[0_12px_32px_-8px_rgba(59,130,246,0.30),0_4px_12px_-4px_rgba(0,0,0,0.20)]",
          "[transform-origin:var(--radix-tooltip-content-transform-origin)]",
          "animate-spring-in data-[state=closed]:animate-spring-out",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/** Rich-data tooltip: icon chip, title, optional description + shortcut. */
interface RichTooltipContentProps extends Omit<TooltipContentProps, "title"> {
  icon?: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  description?: React.ReactNode;
  shortcut?: string;
}

const RichTooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  RichTooltipContentProps
>(({ icon: Icon, title, description, shortcut, className, ...props }, ref) => (
  <TooltipContent
    ref={ref}
    className={cn("max-w-[260px] px-3.5 py-2.5", className)}
    {...props}
  >
    <span className="flex items-start gap-2.5">
      {Icon && (
        <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-400/10 text-blue-500 ring-1 ring-blue-500/20 dark:text-blue-300">
          <Icon className="h-3.5 w-3.5" />
        </span>
      )}
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-[13px] font-semibold leading-tight">
          <span className="truncate">{title}</span>
          {shortcut && (
            <kbd className="shrink-0 rounded border border-border/70 bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
              {shortcut}
            </kbd>
          )}
        </span>
        {description && (
          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </span>
  </TooltipContent>
));
RichTooltipContent.displayName = "RichTooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, RichTooltipContent, TooltipProvider };
