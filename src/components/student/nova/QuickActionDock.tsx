/**
 * QuickActionDock — the student's launcher.
 *
 * Presentational. Ivory: a heading over a hairline, then a grid of quiet
 * link cards (two across on a phone, so nothing scrolls sideways and every
 * tile is a full-size target). The emoji stays, on a sunken disc.
 */
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { FOCUS } from "./ivory";

export interface DockAction {
  to: string;
  emoji: string;
  title: string;
  desc: string;
  /** Kept for callers; the Ivory tiles carry no gradient. */
  gradient: string;
}

export function QuickActionDock({ actions }: { actions: DockAction[] }) {
  return (
    <section aria-labelledby="quick-actions-title">
      <h2
        id="quick-actions-title"
        className="border-b border-hec-line pb-2 font-display text-hec-h2 font-medium text-hec-ink [[data-hec-scale=young]_&]:font-bold"
      >
        Jump back in
      </h2>

      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {actions.map((a) => (
          <li key={a.to + a.title} className="min-w-0">
            <Link
              to={a.to}
              className={cn(
                "flex h-full min-h-hec-target flex-col gap-3 rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1 transition-shadow duration-hec-1 ease-hec hover:shadow-hec-2 [[data-hec-scale=young]_&]:bg-hec-honey",
                FOCUS,
              )}
            >
              <span
                aria-hidden
                className="flex h-11 w-11 items-center justify-center rounded-full bg-hec-sunken text-2xl"
              >
                {a.emoji}
              </span>
              <span className="min-w-0">
                <span className="block text-hec-body font-medium text-hec-ink">{a.title}</span>
                <span className="block text-hec-small text-hec-ink-soft">{a.desc}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
