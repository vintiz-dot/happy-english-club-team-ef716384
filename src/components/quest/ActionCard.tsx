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
  default: "bg-hec-sunken text-hec-ink-soft",
  primary: "bg-hec-sunken text-hec-brass",
  warning: "bg-hec-warn-tint text-hec-warn",
  success: "bg-hec-leaf-tint text-hec-leaf",
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
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-hec-md", TONES[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="min-w-0 whitespace-normal break-words text-hec-small font-semibold text-hec-ink sm:text-hec-body">{title}</span>
          {badge}
        </div>
        {description && (
          <div className="mt-0.5 line-clamp-2 text-hec-caption text-hec-ink-soft">{description}</div>
        )}
      </div>
      {rightSlot ?? <ChevronRight className="h-4 w-4 shrink-0 text-hec-ink-faint" />}
    </>
  );

  const baseClass = cn(
    "group flex min-h-hec-target w-full items-center gap-3 rounded-hec-lg border border-hec-line bg-hec-surface px-3 py-3 text-left shadow-hec-1 transition-shadow duration-hec-1 ease-hec hover:shadow-hec-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring sm:px-4 sm:py-3.5",
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
