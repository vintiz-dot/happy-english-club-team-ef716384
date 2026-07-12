import { ReactNode } from "react";
import { LucideIcon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface ActionCardProps {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  to?: string;
  onClick?: () => void;
  badge?: ReactNode;
  tone?: "default" | "primary" | "warning" | "success";
  className?: string;
  rightSlot?: ReactNode;
}

const TONES: Record<NonNullable<ActionCardProps["tone"]>, string> = {
  default: "text-muted-foreground bg-muted",
  primary: "text-blue-700 dark:text-blue-300 bg-blue-500/15",
  warning: "text-amber-700 dark:text-amber-300 bg-amber-500/15",
  success: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/15",
};

/**
 * Tappable action row — used for "Today's quest" lists, recent items,
 * navigation shortcuts. Renders as <Link> if `to` is given.
 */
export function ActionCard({
  icon: Icon,
  title,
  description,
  to,
  onClick,
  badge,
  tone = "default",
  className,
  rightSlot,
}: ActionCardProps) {
  const Inner = (
    <>
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", TONES[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm sm:text-[15px] truncate">{title}</span>
          {badge}
        </div>
        {description && (
          <div className="type-micro text-muted-foreground line-clamp-2 mt-0.5">{description}</div>
        )}
      </div>
      {rightSlot ?? <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
    </>
  );

  const baseClass = cn(
    "group flex items-center gap-3 w-full rounded-2xl px-3 py-3 sm:px-4 sm:py-3.5 surface-2 ring-1 ring-border/40 lift focus-premium tap-44 text-left",
    className
  );

  if (to) {
    return (
      <Link to={to} className={baseClass}>
        {Inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={baseClass}>
      {Inner}
    </button>
  );
}
