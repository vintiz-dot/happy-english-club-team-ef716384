import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";
import { useOverlayContainer } from "@/hooks/useFullscreenContainer";

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
 * - Touch: Radix opens tooltips on hover and keyboard focus only, so a tap
 *   never showed one. A tap with a finger or pen now toggles the tooltip;
 *   a tap anywhere else or Escape closes it. Mouse and keyboard behave as
 *   before (the tap state is separate and only a touch/pen click sets it).
 * - Fullscreen: content portals into the fullscreen element while there is
 *   one (useFullscreenContainer), and to document.body otherwise.
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

interface TouchToggle {
  toggle: () => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
}
const TouchToggleContext = React.createContext<TouchToggle | null>(null);

const Tooltip = ({
  open: openProp,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) => {
  const controlled = openProp !== undefined;
  // Radix's own open state (hover / focus), held here instead of inside Radix
  // so the tap state can be OR-ed in. Same transitions as uncontrolled Radix.
  const [radixOpen, setRadixOpen] = React.useState(defaultOpen ?? false);
  const [tapOpen, setTapOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!controlled) setRadixOpen(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );

  React.useEffect(() => {
    if (!tapOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = triggerRef.current;
      if (t && e.target instanceof Node && t.contains(e.target)) return; // the trigger toggles itself
      setTapOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTapOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [tapOpen]);

  const touch = React.useMemo<TouchToggle>(() => ({ toggle: () => setTapOpen((o) => !o), triggerRef }), []);

  if (controlled) {
    // the caller owns the state: unchanged, no tap toggle
    return <TooltipPrimitive.Root open={openProp} onOpenChange={onOpenChange} {...props} />;
  }
  return (
    <TouchToggleContext.Provider value={touch}>
      <TooltipPrimitive.Root open={radixOpen || tapOpen} onOpenChange={handleOpenChange} {...props} />
    </TouchToggleContext.Provider>
  );
};

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ onPointerDown, onClick, ...props }, ref) => {
  const touch = React.useContext(TouchToggleContext);
  const lastPointer = React.useRef("");
  const setRef = React.useCallback(
    (node: HTMLButtonElement | null) => {
      if (touch) touch.triggerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref, touch],
  );
  return (
    <TooltipPrimitive.Trigger
      ref={setRef}
      onPointerDown={(e) => {
        lastPointer.current = e.pointerType;
        onPointerDown?.(e);
      }}
      onClick={(e) => {
        onClick?.(e);
        if (touch && (lastPointer.current === "touch" || lastPointer.current === "pen")) touch.toggle();
        lastPointer.current = "";
      }}
      {...props}
    />
  );
});
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName;

interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  container?: HTMLElement | null;
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, sideOffset = 6, container, ...props }, ref) => {
  const [fullscreen, contentRef] = useOverlayContainer(ref);
  const portalContainer = container ?? fullscreen;
  return (
    <TooltipPrimitive.Portal container={portalContainer}>
      <TooltipPrimitive.Content
        ref={contentRef}
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
