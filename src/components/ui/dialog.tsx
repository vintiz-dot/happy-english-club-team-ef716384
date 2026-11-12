import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useOverlayContainer } from "@/hooks/useFullscreenContainer";
import { useIvory } from "@/hooks/useIvory";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const ivory = useIvory();
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        ivory
          ? "fixed inset-0 z-[100] bg-hec-scrim/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-hec-2"
          : "fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 transition-all duration-300",
        className,
      )}
      {...props}
    />
  );
});
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  // into the fullscreen element while there is one, else document.body (as before)
  const [container, contentRef] = useOverlayContainer(ref);
  const ivory = useIvory();
  return (
  <DialogPortal container={container}>
    <DialogOverlay />
      <DialogPrimitive.Content
        ref={contentRef}
        className={cn(
          // The open/close keyframes animate `scale` / `translate` (individual
          // properties), never `transform`, so the centring translate below
          // holds through the animation: no jump on open (tailwind.config.ts).
          ivory
            ? "fixed left-[50%] top-[50%] z-[100] grid w-[calc(100%-2rem)] max-w-lg max-h-[85dvh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 rounded-hec-lg border border-hec-line bg-hec-raised p-6 text-hec-ink shadow-hec-3 data-[state=open]:animate-hec-in data-[state=closed]:animate-hec-out"
            : "glass-premium fixed left-[50%] top-[50%] z-[100] grid w-full max-w-lg max-h-[85vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 p-6 shadow-2xl data-[state=open]:animate-spring-in data-[state=closed]:animate-spring-out sm:rounded-2xl",
          className,
        )}
        {...props}
      >
      {children}
      <DialogPrimitive.Close
        className={
          ivory
            ? "absolute right-2 top-2 inline-flex min-h-hec-target min-w-hec-target items-center justify-center rounded-hec-md text-hec-ink-soft transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken hover:text-hec-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring disabled:pointer-events-none"
            : "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        }
      >
        <X className={ivory ? "h-5 w-5" : "h-4 w-4"} />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const ivory = useIvory();
  return (
    <div
      className={cn(ivory ? "flex flex-col gap-2 pr-8 text-left" : "flex flex-col space-y-1.5 text-center sm:text-left", className)}
      {...props}
    />
  );
};
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const ivory = useIvory();
  return (
    <div
      className={cn(
        ivory ? "flex flex-col-reverse gap-3 sm:flex-row sm:justify-end" : "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className,
      )}
      {...props}
    />
  );
};
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => {
  const ivory = useIvory();
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn(
        ivory ? "font-display text-hec-h2 font-medium text-hec-ink" : "text-lg font-semibold leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  );
});
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => {
  const ivory = useIvory();
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn(ivory ? "text-hec-body text-hec-ink-soft" : "text-sm text-muted-foreground", className)}
      {...props}
    />
  );
});
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
