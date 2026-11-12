import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

import { cn } from "@/lib/utils";
import { useOverlayContainer } from "@/hooks/useFullscreenContainer";
import { buttonVariants, ivoryButtonVariants } from "@/components/ui/button";
import { useIvory } from "@/hooks/useIvory";

const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const ivory = useIvory();
  return (
  <AlertDialogPrimitive.Overlay
    className={cn(
      ivory
        ? "fixed inset-0 z-50 bg-hec-scrim/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        : "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
  );
});
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => {
  // into the fullscreen element while there is one, else document.body (as before)
  const [container, contentRef] = useOverlayContainer(ref);
  const ivory = useIvory();
  return (
  <AlertDialogPortal container={container}>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={contentRef}
      className={cn(
        ivory
          ? // DESIGN_SYSTEM s.14 destructive confirm: inset 16 px at 375, at most 85dvh, scrolls inside.
            "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-md max-h-[85dvh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 rounded-hec-lg border border-hec-line bg-hec-raised p-6 text-hec-ink shadow-hec-3 data-[state=open]:animate-hec-in data-[state=closed]:animate-hec-out"
          : "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className,
      )}
      {...props}
    />
  </AlertDialogPortal>
  );
});
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const ivory = useIvory();
  return <div className={cn(ivory ? "flex flex-col gap-2 text-left" : "flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />;
};
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const ivory = useIvory();
  return (
    <div
      className={cn(
        // Ivory: stacked full width at 375 with the safe button at the bottom, a row from sm.
        ivory ? "mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end" : "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className,
      )}
      {...props}
    />
  );
};
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => {
  const ivory = useIvory();
  return (
    <AlertDialogPrimitive.Title
      ref={ref}
      className={cn(ivory ? "font-display text-hec-h2 font-medium text-hec-ink" : "text-lg font-semibold", className)}
      {...props}
    />
  );
});
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => {
  const ivory = useIvory();
  return (
    <AlertDialogPrimitive.Description
      ref={ref}
      className={cn(ivory ? "text-hec-body text-hec-ink-soft" : "text-sm text-muted-foreground", className)}
      {...props}
    />
  );
});
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => {
  const ivory = useIvory();
  return (
    <AlertDialogPrimitive.Action
      ref={ref}
      className={cn(ivory ? ivoryButtonVariants({ className: "w-full sm:w-auto" }) : buttonVariants(), className)}
      {...props}
    />
  );
});
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => {
  const ivory = useIvory();
  return (
    <AlertDialogPrimitive.Cancel
      ref={ref}
      className={cn(
        ivory ? ivoryButtonVariants({ variant: "outline", className: "w-full sm:w-auto" }) : cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0"),
        className,
      )}
      {...props}
    />
  );
});
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
