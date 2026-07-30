/**
 * QuickActionDock — the student's launcher rail.
 *
 * Presentational. Replaces the old 4-card grid of quick links with a denser,
 * more tactile dock: gradient tiles that lift and glow, comfortable tap
 * targets on mobile, and a horizontal scroll on narrow screens with end
 * padding so the final tile can never clip.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface DockAction {
  to: string;
  emoji: string;
  title: string;
  desc: string;
  /** tailwind gradient stops, e.g. "from-blue-500 to-cyan-500" */
  gradient: string;
}

export function QuickActionDock({ actions }: { actions: DockAction[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-black">Jump back in</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 pr-4 sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:pr-0 sm:overflow-visible">
        {actions.map((a, i) => (
          <motion.div
            key={a.to + a.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="shrink-0 w-[132px] sm:w-auto"
          >
            <Link to={a.to} className="block h-full group">
              <div className="holo-card h-full p-4 text-center sm:text-left">
                <div
                  className={cn(
                    "icon-well mx-auto sm:mx-0 h-11 w-11 flex items-center justify-center text-2xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6",
                    a.gradient,
                  )}
                >
                  <span className="drop-shadow-sm">{a.emoji}</span>
                </div>
                <p className="mt-3 text-sm font-bold leading-tight">{a.title}</p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{a.desc}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
