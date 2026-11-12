import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";
import { useOverlayContainer } from "@/hooks/useFullscreenContainer";
import { useIvory } from "@/hooks/useIvory";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
  // into the fullscreen element while there is one, else document.body (as before)
  const [container, contentRef] = useOverlayContainer(ref);
  const ivory = useIvory();
  return (
  <PopoverPrimitive.Portal container={container}>
  <PopoverPrimitive.Content
    ref={contentRef}
    align={align}
    sideOffset={sideOffset}
    className={cn(
      ivory
        ? "z-[100] w-72 max-w-[calc(100vw-2rem)] rounded-hec-md border border-hec-line bg-hec-raised p-4 text-hec-ink shadow-hec-2 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-hec-2"
        : cn(
            "glass nova-tip z-[100] w-72 rounded-2xl p-4 text-popover-foreground shadow-q4 outline-none",
            "[transform-origin:var(--radix-popover-content-transform-origin)]",
            "data-[state=open]:animate-spring-in data-[state=closed]:animate-spring-out",
          ),
      className,
    )}
    {...props}
  />
  </PopoverPrimitive.Portal>
  );
});
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
