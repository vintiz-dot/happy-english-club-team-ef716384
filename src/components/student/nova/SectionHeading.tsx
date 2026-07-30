/**
 * SectionHeading — consistent section rhythm across the student dashboard.
 * Presentational: gradient icon well, title, optional subtitle and action.
 */
import { cn } from "@/lib/utils";

interface Props {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  gradient?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeading({
  icon: Icon, title, subtitle, gradient = "from-violet-500 to-indigo-600", action, className,
}: Props) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("icon-well p-2.5 shrink-0 bg-gradient-to-br", gradient)}>
        <Icon className="h-5 w-5 text-white drop-shadow" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg md:text-xl font-black leading-tight truncate">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      {action}
      <div className="hidden sm:block h-px flex-1 bg-gradient-to-r from-border to-transparent" />
    </div>
  );
}
