import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { BADGE_BRASS, CARD, CARD_TITLE } from "@/components/student/nova/ivory";

interface MonitorStatusCardProps {
  classNames: string[];
}

/**
 * The class-monitor honour, in the "Ivory" design system: one card edged in
 * brass (the honour is a reward), an ink seal, and each class as a brass
 * badge. No particles, no sweeps, no spinning crowns.
 */
export function MonitorStatusCard({ classNames }: MonitorStatusCardProps) {
  if (classNames.length === 0) return null;

  return (
    <section className={cn(CARD, "border-hec-brass/40")}>
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-hec-action text-hec-on-action">
          <Shield className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className={CARD_TITLE}>Royal Monitor</h2>
          <p className="mt-1 text-hec-small text-hec-ink-soft">
            You've been crowned as a class leader! 👑
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {classNames.map((name) => (
              <span key={name} className={cn(BADGE_BRASS, "whitespace-normal break-words")}>
                <span aria-hidden>👑</span> {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
