/**
 * SectionHeading — consistent section rhythm across the student dashboard.
 * Presentational. Ivory: the display serif over a hairline, one ink icon.
 */
import { cn } from "@/lib/utils";

interface Props {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  /** Kept for callers; the Ivory heading has no gradient. */
  gradient?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeading({
  icon: Icon, title, subtitle, action, className,
}: Props) {
  return (
    <div className={cn("flex items-end gap-3 border-b border-hec-line pb-2", className)}>
      <Icon className="mb-1.5 h-5 w-5 shrink-0 text-hec-ink-soft" aria-hidden />
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-hec-h2 font-medium text-hec-ink [[data-hec-scale=young]_&]:font-bold">{title}</h2>
        {subtitle && <p className="text-hec-small text-hec-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
