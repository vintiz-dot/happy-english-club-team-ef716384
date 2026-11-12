import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";
import { useIvory } from "@/hooks/useIvory";

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const ivory = useIvory();
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        ivory
          ? // A sunken well; the selected tab is a raised surface inside it (no colour fill).
            "inline-flex max-w-full items-center justify-start gap-1 overflow-x-auto rounded-hec-md bg-hec-sunken p-1 text-hec-ink-soft"
          : "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const ivory = useIvory();
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        ivory
          ? `inline-flex min-h-hec-target items-center justify-center gap-2 whitespace-nowrap rounded-hec-sm px-3 text-hec-small font-medium text-hec-ink-soft transition-colors duration-hec-1 ease-hec hover:text-hec-ink disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-hec-raised data-[state=active]:text-hec-ink data-[state=active]:shadow-hec-1 ${FOCUS}`
          : "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => {
  const ivory = useIvory();
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        ivory
          ? `mt-4 ${FOCUS}`
          : "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    />
  );
});
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
