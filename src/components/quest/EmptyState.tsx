import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * Friendly empty state — used when a list/section has no data.
 * Replaces the various "no data" paragraphs scattered through the app.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12 rounded-3xl surface-2 ring-1 ring-border/40",
        className
      )}
    >
      <div className="h-14 w-14 rounded-2xl bg-aurora flex items-center justify-center text-white shadow-q3 mb-4">
        <Icon className="h-6 w-6" />
      </div>
      <p className="type-h2 mb-1">{title}</p>
      {description && (
        <p className="type-body text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
