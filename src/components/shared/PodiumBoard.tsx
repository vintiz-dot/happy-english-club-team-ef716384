/**
 * The podium board.
 *
 * Replaces "The Arena", which was a dark neon scoreboard: black panel,
 * glowing rings, XP, "CHAMPION / ELITE / WARRIOR". Three problems with
 * that, in order of how much they mattered.
 *
 * It was unreadable where it is actually used. This board gets projected
 * onto a classroom wall; a dark UI on a classroom projector is a grey
 * smear, and the lowest-contrast text on it was the children's own names.
 *
 * It told every child below third place that they were losing. The
 * language was combat and the visual weight was all at the top. So the
 * podium still celebrates the top three — children like winning and
 * pretending otherwise is dishonest — but every other row now leads with
 * what that child has done rather than where they rank: their points,
 * their own progress bar, their homework and participation split.
 *
 * And it looked nothing like the rest of the app's classroom surfaces.
 *
 * Functionally this is the same component: identical props, identical
 * selection, economy, analytics and rank-movement behaviour.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { getAvatarUrl, getRandomAvatarUrl } from "@/lib/avatars";
import { BookOpen, Flame, Sparkles, SpellCheck, Star, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogSpendButton } from "@/components/shared/EconomyActions";
import { useIvory } from "@/hooks/useIvory";

/** The `FOCUS` ring of docs/DESIGN_SYSTEM.md s.15. */
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

export interface BoardEntry {
  id: string;
  student_id: string;
  rank: number;
  total_points: number;
  homework_points: number;
  participation_points: number;
  reading_theory_points: number;
  /**
   * The fourth bucket. student_points has had it all along and
   * total_points is GENERATED across all four, so leaving it out of this
   * type is why the pills below never added up to the number beside them.
   * Optional because older callers may not select it; treated as 0.
   */
  vocabulary_quiz_points?: number;
  students?: { full_name?: string; avatar_url?: string | null } | null;
}

export interface PodiumBoardProps {
  entries: BoardEntry[];
  classId: string;
  currentStudentId?: string;
  canManagePoints: boolean;
  isEconomyMode: boolean;
  economyCash: Map<string, number> | undefined;
  pendingByStudent: Map<string, number>;
  selectedStudents: Map<string, { id: string; name: string; avatarUrl?: string | null }>;
  onToggleSelect: (
    s: { id: string; name: string; avatarUrl?: string | null },
    e?: React.MouseEvent,
  ) => void;
  onOpenAnalytics: (entry: BoardEntry) => void;
  /** This month's class monitor, marked with a star. */
  monitorStudentId?: string | null;
}

/**
 * Podium styling by rank. Warm metals, not neon. `order` puts first place
 * in the middle, which is where a podium puts it — the entries arrive in
 * rank order and CSS does the rearranging, so nothing has to shuffle the
 * array and risk dropping a place when there are only two students.
 */
const TIERS: Record<
  1 | 2 | 3,
  { tone: string; ink: string; inkSoft: string; plinth: string; order: string }
> = {
  1: {
    tone: "hsl(var(--studio-butter))",
    ink: "hsl(var(--studio-butter-ink))",
    inkSoft: "hsl(var(--studio-butter-ink) / 0.5)",
    plinth: "h-14 sm:h-20",
    order: "order-2",
  },
  2: {
    tone: "hsl(var(--studio-sky))",
    ink: "hsl(var(--studio-sky-ink))",
    inkSoft: "hsl(var(--studio-sky-ink) / 0.5)",
    plinth: "h-9 sm:h-14",
    order: "order-1",
  },
  3: {
    tone: "hsl(var(--studio-clay))",
    ink: "hsl(var(--studio-clay-ink))",
    inkSoft: "hsl(var(--studio-clay-ink) / 0.5)",
    plinth: "h-6 sm:h-10",
    order: "order-3",
  },
};

/**
 * TIERS in the "Ivory" system (DESIGN_SYSTEM s.3, s.15 brass badge): the
 * podium is drawn in the system's tokens instead of the studio metals. First
 * place is the brass fill (a reward, the one brass thing in the podium);
 * second and third are quiet ink on sunken / hairline tones, told apart by
 * the number on the medal and the plinth height, not by colour. Same keys,
 * plinth heights and order as TIERS.
 */
const TIERS_IVORY: typeof TIERS = {
  1: {
    tone: "hsl(var(--hec-brass-fill))",
    ink: "hsl(var(--hec-on-brass))",
    inkSoft: "hsl(var(--hec-brass))",
    plinth: "h-14 sm:h-20",
    order: "order-2",
  },
  2: {
    tone: "hsl(var(--hec-sunken))",
    ink: "hsl(var(--hec-ink))",
    inkSoft: "hsl(var(--hec-brass))",
    plinth: "h-9 sm:h-14",
    order: "order-1",
  },
  3: {
    tone: "hsl(var(--hec-line))",
    ink: "hsl(var(--hec-ink))",
    inkSoft: "hsl(var(--hec-brass))",
    plinth: "h-6 sm:h-10",
    order: "order-3",
  },
};

/**
 * Points → level. Each level costs 25 more than the last, so the first
 * few arrive quickly and the curve stretches afterwards.
 */
function levelFromPoints(p: number) {
  const level = Math.floor((-1 + Math.sqrt(1 + (8 * p) / 25)) / 2) + 1;
  const prev = (25 * (level - 1) * level) / 2;
  const next = (25 * level * (level + 1)) / 2;
  const pct = next === prev ? 0 : Math.min(100, ((p - prev) / (next - prev)) * 100);
  return { level: Math.max(1, level), pct, toNext: Math.max(0, Math.ceil(next - p)) };
}

function Medal({ rank, size = 28 }: { rank: number; size?: number }) {
  const ivory = useIvory();
  const tier = (ivory ? TIERS_IVORY : TIERS)[rank as 1 | 2 | 3];
  if (!tier) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <circle cx="20" cy="20" r="18" style={{ fill: ivory ? "hsl(var(--hec-surface))" : "hsl(var(--studio-card))" }} />
      <circle cx="20" cy="20" r="15" style={{ fill: tier.tone }} />
      <circle
        cx="20"
        cy="20"
        r="15"
        fill="none"
        style={{ stroke: tier.ink }}
        strokeWidth="1.5"
        opacity="0.45"
      />
      <circle cx="20" cy="20" r="10.5" fill="none" style={{ stroke: tier.ink }} strokeWidth="1" opacity="0.3" />
      <text
        x="20"
        y="21"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fill: tier.ink, fontSize: 15, fontWeight: ivory ? 600 : 800 }}
      >
        {rank}
      </text>
    </svg>
  );
}

function Avatar48({
  entry,
  className,
  ring,
}: {
  entry: BoardEntry;
  className?: string;
  ring?: string;
}) {
  const ivory = useIvory();
  return (
    <Avatar className={cn(ivory ? "border-2 bg-hec-sunken" : "border-[3px] bg-studio-stage", className)} style={{ borderColor: ring }}>
      <AvatarImage
        src={getAvatarUrl(entry.students?.avatar_url) || getRandomAvatarUrl(entry.student_id)}
        alt={ivory ? "" : undefined}
        className="object-cover"
      />
      <AvatarFallback className={ivory ? "bg-hec-sunken font-semibold text-hec-ink" : "bg-studio-stage font-bold text-ink"}>
        {entry.students?.full_name?.[0] ?? "?"}
      </AvatarFallback>
    </Avatar>
  );
}

/** Marks this month's class monitor. */
function MonitorStar({ size = 16 }: { size?: number }) {
  const ivory = useIvory();
  return (
    <span
      title="Class monitor"
      className={ivory ? "grid shrink-0 place-items-center rounded-full bg-hec-brass-fill p-1 shadow-hec-1" : "grid place-items-center rounded-full bg-[hsl(var(--studio-butter))] p-1 shadow-studio"}
      style={{ width: size + 8, height: size + 8 }}
    >
      <Star
        className={ivory ? "fill-current text-hec-on-brass" : "fill-current text-[hsl(var(--studio-butter-ink))]"}
        style={{ width: size, height: size }}
        aria-hidden
      />
      <span className="sr-only">Class monitor</span>
    </span>
  );
}

/** Thin bar showing progress toward the next level. */
function ProgressBead({ pct, color }: { pct: number; color: string }) {
  const ivory = useIvory();
  return (
    <div className={ivory ? "h-2 w-full overflow-hidden rounded-full bg-hec-sunken" : "h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--studio-ink)/0.1)]"}>
      <motion.div
        // Ivory: no width animation on load (DESIGN_SYSTEM s.9: nothing that changes layout).
        initial={ivory ? false : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={ivory ? { duration: 0 } : { duration: 0.8, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

/* --------------------------------------------------------- podium place */

function PodiumPlace({
  entry,
  movement,
  isSelf,
  isMonitor,
  onClick,
}: {
  entry: BoardEntry;
  movement?: "up" | "down";
  isSelf: boolean;
  isMonitor: boolean;
  onClick: () => void;
}) {
  const ivory = useIvory();
  const tier = (ivory ? TIERS_IVORY : TIERS)[entry.rank as 1 | 2 | 3];
  const { level, pct } = levelFromPoints(entry.total_points);
  const first = entry.rank === 1;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={ivory ? { opacity: 0, y: 8 } : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ivory ? { duration: 0.24, ease: [0.22, 1, 0.36, 1], delay: first ? 0 : 0.06 } : { type: "spring", stiffness: 240, damping: 22, delay: first ? 0 : 0.1 }}
      whileHover={ivory ? undefined : { y: -3 }}
      whileTap={ivory ? undefined : { scale: 0.98 }}
      className={ivory ? cn("group flex w-full min-w-0 flex-col items-center justify-end rounded-hec-lg text-center", FOCUS) : "studio-focus group flex w-full min-w-0 flex-col items-center justify-end text-center"}
    >
      {/* Card */}
      <div
        className={cn(
          ivory
            ? "relative w-full rounded-hec-lg border border-hec-line bg-hec-surface px-2 pb-3 pt-6 shadow-hec-1 transition-shadow duration-hec-1 ease-hec group-hover:shadow-hec-2"
            : "relative w-full rounded-2xl border border-studio bg-studio-card px-2 pb-3 pt-6 shadow-studio",
          first && (ivory ? "shadow-hec-2" : "shadow-studio-lg"),
          isSelf && (ivory ? "border-hec-brass ring-1 ring-hec-brass" : "ring-2 ring-[hsl(var(--studio-ink))]"),
        )}
      >
        {first && (
          <Sparkles
            className={ivory ? "absolute left-1/2 top-2 h-4 w-4 -translate-x-1/2 text-hec-brass" : "absolute left-1/2 top-2 h-4 w-4 -translate-x-1/2 text-[hsl(var(--studio-butter-ink))]"}
            aria-hidden
          />
        )}

        <div className="relative mx-auto mb-2 w-fit">
          <Avatar48
            entry={entry}
            ring={tier.tone}
            className={first ? "h-16 w-16 sm:h-20 sm:w-20" : "h-12 w-12 sm:h-16 sm:w-16"}
          />
          <span className="absolute -bottom-1 -right-1">
            <Medal rank={entry.rank} size={first ? 26 : 22} />
          </span>
          {isMonitor && (
            <span className="absolute -left-1 bottom-0">
              <MonitorStar size={12} />
            </span>
          )}
          <AnimatePresence>
            {movement && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className={cn(
                  ivory
                    ? "absolute -left-1 -top-1 grid h-6 w-6 place-items-center rounded-full border text-hec-caption font-semibold leading-none"
                    : "absolute -left-1 -top-1 grid h-5 w-5 place-items-center rounded-full text-[10px] font-black",
                  movement === "up"
                    ? ivory ? "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf" : "bg-[hsl(var(--studio-sage))] text-[hsl(var(--studio-sage-ink))]"
                    : ivory ? "border-hec-line bg-hec-sunken text-hec-ink-soft" : "bg-[hsl(var(--studio-clay))] text-[hsl(var(--studio-clay-ink))]",
                )}
              >
                {movement === "up" ? "▲" : "▼"}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <p
          className={cn(
            ivory
              ? "whitespace-normal break-words hyphens-none text-balance px-1 text-hec-ink"
              : "studio-title truncate px-1",
            first
              ? ivory ? "text-hec-h3" : "text-base sm:text-lg"
              : ivory ? "text-hec-small font-semibold sm:text-hec-body" : "text-sm sm:text-base",
          )}
        >
          {entry.students?.full_name}
          {isSelf && <span className={ivory ? "ml-1 font-normal text-hec-ink-soft" : "ml-1 text-ink-faint"}>(you)</span>}
        </p>

        <p
          className={cn(
            ivory ? "mt-1 whitespace-nowrap font-sans font-semibold tabular-nums text-hec-ink" : "studio-title tabular-nums",
            first
              ? ivory ? "text-hec-h1" : "text-2xl sm:text-3xl"
              : ivory ? "text-hec-h2" : "text-xl sm:text-2xl",
          )}
          style={ivory ? undefined : { color: tier.ink }}
        >
          {entry.total_points}
        </p>
        <p className={ivory ? "mb-2 text-hec-caption font-medium tabular-nums text-hec-ink-soft" : "mb-2 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-ink-faint"}>
          points · level {level}
        </p>
        <div className="mx-auto w-3/4">
          <ProgressBead pct={pct} color={tier.inkSoft} />
        </div>
      </div>

      {/* Plinth. Solid, with the place carved into it — a faded gradient
          here just looked like the card had failed to finish rendering. */}
      <div
        className={cn(
          ivory ? "grid w-[86%] place-items-center rounded-b-hec-md border-x border-b border-hec-line" : "grid w-[86%] place-items-center rounded-b-xl",
          tier.plinth,
        )}
        style={
          ivory
            ? { background: tier.tone }
            : {
          background: tier.tone,
          boxShadow: "inset 0 2px 0 hsl(0 0% 100% / 0.35), inset 0 -6px 12px hsl(34 30% 30% / 0.14)",
        }}
      >
        <span
          className={ivory ? "font-sans text-hec-h2 font-semibold leading-none tabular-nums" : "font-studio text-xl font-semibold leading-none sm:text-2xl"}
          style={ivory ? { color: tier.ink } : { color: tier.ink, opacity: 0.55 }}
          aria-hidden
        >
          {entry.rank}
        </span>
      </div>
    </motion.button>
  );
}

/* ------------------------------------------------------------- list row */

function BoardRow({
  entry,
  index,
  isSelf,
  isSelected,
  isMonitor,
  canManagePoints,
  isEconomyMode,
  cash,
  pendingCount,
  movement,
  onClick,
  onToggleSelect,
  classId,
}: {
  entry: BoardEntry;
  index: number;
  isSelf: boolean;
  isSelected: boolean;
  isMonitor: boolean;
  canManagePoints: boolean;
  isEconomyMode: boolean;
  cash: number;
  pendingCount: number;
  movement?: "up" | "down";
  onClick: () => void;
  onToggleSelect: (e: React.MouseEvent) => void;
  classId: string;
}) {
  const ivory = useIvory();
  const { level, pct } = levelFromPoints(entry.total_points);

  return (
    <motion.div
      layout={!ivory}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.25), duration: 0.22 }}
      onClick={onClick}
      className={cn(
        ivory
          ? "flex min-h-hec-target cursor-pointer items-start gap-3 rounded-hec-md border border-hec-line bg-hec-surface px-3 py-3 transition-shadow duration-hec-1 ease-hec"
          : "flex cursor-pointer items-center gap-3 rounded-2xl border border-studio bg-studio-card px-3 py-2.5 transition-all",
        ivory ? "hover:shadow-hec-2" : "hover:-translate-y-0.5 hover:shadow-studio",
        isSelf && (ivory ? "border-hec-brass ring-1 ring-hec-brass" : "ring-2 ring-[hsl(var(--studio-ink))]"),
        isSelected && !isSelf && (ivory ? "border-hec-brass bg-hec-sunken" : "ring-2 ring-[hsl(var(--studio-sky-ink))]"),
      )}
    >
      {canManagePoints && (
        <div
          className={ivory ? "-m-3 grid min-h-hec-target min-w-hec-target shrink-0 cursor-pointer place-items-center self-center" : "shrink-0"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(e);
          }}
        >
          <Checkbox
            checked={isSelected}
            aria-label={`Select ${entry.students?.full_name ?? "student"}`}
            className={ivory ? "h-5 w-5 rounded-hec-sm border-2 border-hec-line-strong data-[state=checked]:border-hec-action data-[state=checked]:bg-hec-action data-[state=checked]:text-hec-on-action" : "h-5 w-5 rounded-md border-2 border-[hsl(var(--studio-ink)/0.3)] data-[state=checked]:border-[hsl(var(--studio-ink))] data-[state=checked]:bg-[hsl(var(--studio-ink))]"}
          />
        </div>
      )}

      <span className={ivory ? "w-8 shrink-0 self-center text-center text-hec-small font-semibold tabular-nums text-hec-ink-soft" : "w-7 shrink-0 text-center text-sm font-bold tabular-nums text-ink-faint"}>
        {entry.rank}
      </span>

      <div className={ivory ? "relative shrink-0 self-center" : "relative shrink-0"}>
        <Avatar48 entry={entry} ring={ivory ? "hsl(var(--hec-line))" : "hsl(var(--studio-line))"} className="h-10 w-10" />
        {movement && (
          <span
            className={cn(
              ivory
                ? "absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border text-hec-caption font-semibold leading-none"
                : "absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full text-[9px] font-black",
              movement === "up"
                ? ivory ? "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf" : "bg-[hsl(var(--studio-sage))] text-[hsl(var(--studio-sage-ink))]"
                : ivory ? "border-hec-line bg-hec-sunken text-hec-ink-soft" : "bg-[hsl(var(--studio-clay))] text-[hsl(var(--studio-clay-ink))]",
            )}
          >
            {movement === "up" ? "▲" : "▼"}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className={ivory ? "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1" : "flex min-w-0 items-center gap-1.5"}>
          <span className={ivory ? "min-w-0 whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink" : "truncate font-bold text-ink"}>{entry.students?.full_name}</span>
          {isMonitor && <MonitorStar size={10} />}
          {isSelf && <span className={ivory ? "shrink-0 text-hec-caption text-hec-ink-soft" : "shrink-0 text-xs text-ink-faint"}>(you)</span>}
          {pendingCount > 0 && (
            <span className={ivory ? "shrink-0 rounded-full border border-hec-warn/30 bg-hec-warn-tint px-2 text-hec-caption font-medium tabular-nums text-hec-warn" : "shrink-0 rounded-full bg-[hsl(var(--studio-butter))] px-1.5 py-0.5 text-[0.625rem] font-bold text-[hsl(var(--studio-butter-ink))]"}>
              {pendingCount} pending
            </span>
          )}
        </div>
        <div className={ivory ? "mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-hec-caption tabular-nums text-hec-ink-soft" : "mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[0.6875rem] text-ink-soft"}>
          <span className="inline-flex items-center gap-1" title="Homework">
            <BookOpen className={ivory ? "h-3.5 w-3.5" : "h-3 w-3"} aria-hidden /> {entry.homework_points}
          </span>
          <span className="inline-flex items-center gap-1" title="Participation">
            <Zap className={ivory ? "h-3.5 w-3.5" : "h-3 w-3"} aria-hidden /> {entry.participation_points}
          </span>
          {entry.reading_theory_points > 0 && (
            <span className="inline-flex items-center gap-1" title="Reading">
              <Flame className={ivory ? "h-3.5 w-3.5" : "h-3 w-3"} aria-hidden /> {entry.reading_theory_points}
            </span>
          )}
          {(entry.vocabulary_quiz_points ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1" title="Vocabulary">
              <SpellCheck className={ivory ? "h-3.5 w-3.5" : "h-3 w-3"} aria-hidden /> {entry.vocabulary_quiz_points}
            </span>
          )}
          {isEconomyMode && (
            <span className={ivory ? "inline-flex items-center gap-1 whitespace-nowrap font-semibold text-hec-ink" : "inline-flex items-center gap-1 font-semibold text-[hsl(var(--studio-sage-ink))]"}>
              ₫{cash}
            </span>
          )}
        </div>
      </div>

      {/* Level, in a fixed column. Letting the bar fill the row turned a
          small progress indicator into the widest thing on the board. */}
      <div className={ivory ? "hidden w-24 shrink-0 self-center sm:block" : "hidden w-24 shrink-0 sm:block"}>
        <ProgressBead pct={pct} color={ivory ? "hsl(var(--hec-brass))" : "hsl(var(--studio-ink) / 0.26)"} />
        <p className={ivory ? "mt-1 text-right text-hec-caption tabular-nums text-hec-ink-soft" : "mt-1 text-right text-[0.625rem] text-ink-faint"}>Level {level}</p>
      </div>

      <div className={ivory ? "shrink-0 self-center text-right" : "shrink-0 text-right"}>
        <span className={ivory ? "whitespace-nowrap font-sans text-hec-h2 font-semibold tabular-nums text-hec-ink" : "studio-title text-xl tabular-nums sm:text-2xl"}>
          {entry.total_points}
        </span>
        {isEconomyMode && canManagePoints && cash > 0 && (
          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
            <LogSpendButton
              studentId={entry.student_id}
              classId={classId}
              studentName={entry.students?.full_name || ""}
              cashOnHand={cash}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ---------------------------------------------------------------- board */

export function PodiumBoard({
  entries,
  classId,
  currentStudentId,
  canManagePoints,
  isEconomyMode,
  economyCash,
  pendingByStudent,
  selectedStudents,
  onToggleSelect,
  onOpenAnalytics,
  monitorStudentId,
}: PodiumBoardProps) {
  const ivory = useIvory();
  const previousRanksRef = useRef<Map<string, number>>(new Map());
  const [movement, setMovement] = useState<Map<string, "up" | "down">>(new Map());

  // Diff ranks against the previous render to drive the up/down markers.
  useEffect(() => {
    const prev = previousRanksRef.current;
    const next = new Map<string, "up" | "down">();
    entries.forEach((e) => {
      const old = prev.get(e.student_id);
      if (old != null && old !== e.rank) next.set(e.student_id, e.rank < old ? "up" : "down");
    });
    if (next.size > 0) {
      setMovement(next);
      const t = window.setTimeout(() => setMovement(new Map()), 2400);
      return () => window.clearTimeout(t);
    }
  }, [entries]);

  // Record current ranks after the diff, so the next render compares right.
  useEffect(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => map.set(e.student_id, e.rank));
    previousRanksRef.current = map;
  }, [entries]);

  const top3 = useMemo(() => entries.slice(0, 3), [entries]);
  const rest = useMemo(() => entries.slice(3), [entries]);
  const self = currentStudentId
    ? entries.find((e) => e.student_id === currentStudentId)
    : null;

  if (entries.length === 0) {
    return (
      <div className={ivory ? "m-4 grid min-h-[260px] place-items-center rounded-hec-md border border-dashed border-hec-line bg-hec-sunken/40 p-8 text-center sm:m-6" : "studio-stage m-3 grid min-h-[260px] place-items-center p-8 text-center sm:m-6"}>
        <div>
          <Trophy className={ivory ? "mx-auto mb-3 h-10 w-10 text-hec-ink-faint" : "mx-auto mb-3 h-10 w-10 text-ink-faint"} aria-hidden />
          <p className={ivory ? "font-display text-hec-h2 font-medium text-hec-ink" : "studio-title text-xl"}>Nothing on the board yet</p>
          <p className={ivory ? "mt-1 text-hec-small text-hec-ink-soft" : "mt-1 text-sm text-ink-soft"}>
            Points awarded this month will show up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={ivory ? "px-4 pb-6 pt-2 sm:px-6" : "px-3 pb-6 pt-2 sm:px-6"}>
      {/* Podium — second, first, third, left to right. */}
      <div className="mb-6 flex items-end justify-center gap-2 sm:gap-4">
        {top3.map((entry) => (
          <div key={entry.student_id} className={cn("min-w-0 flex-1", (ivory ? TIERS_IVORY : TIERS)[entry.rank as 1 | 2 | 3]?.order)}>
            <PodiumPlace
              entry={entry}
              movement={movement.get(entry.student_id)}
              isSelf={currentStudentId === entry.student_id}
              isMonitor={monitorStudentId === entry.student_id}
              onClick={() => onOpenAnalytics(entry)}
            />
          </div>
        ))}
      </div>

      {rest.length > 0 && (
        <>
          <div className={ivory ? "mb-2 flex items-baseline justify-between gap-2 px-1" : "mb-2 flex items-baseline justify-between px-1"}>
            <h3 className={ivory ? "text-hec-h3 text-hec-ink" : "studio-title text-base"}>Everyone else</h3>
            <span className={ivory ? "text-hec-caption tabular-nums text-hec-ink-soft" : "text-xs text-ink-faint"}>
              {rest.length} {rest.length === 1 ? "student" : "students"}
            </span>
          </div>
          <div className="space-y-2">
            {rest.map((entry, i) => (
              <BoardRow
                key={entry.student_id}
                entry={entry}
                index={i}
                isSelf={currentStudentId === entry.student_id}
                isSelected={selectedStudents.has(entry.student_id)}
                isMonitor={monitorStudentId === entry.student_id}
                canManagePoints={canManagePoints}
                isEconomyMode={isEconomyMode}
                cash={economyCash?.get(entry.student_id) ?? 0}
                pendingCount={pendingByStudent.get(entry.student_id) ?? 0}
                movement={movement.get(entry.student_id)}
                onClick={() => onOpenAnalytics(entry)}
                onToggleSelect={(e) =>
                  onToggleSelect(
                    {
                      id: entry.student_id,
                      name: entry.students?.full_name || "",
                      avatarUrl: entry.students?.avatar_url,
                    },
                    e,
                  )
                }
                classId={classId}
              />
            ))}
          </div>
        </>
      )}

      {/* "You", pinned, when the viewer is a student outside the podium. */}
      {self && self.rank > 3 && <SelfCard entry={self} onClick={() => onOpenAnalytics(self)} />}
    </div>
  );
}

function SelfCard({ entry, onClick }: { entry: BoardEntry; onClick: () => void }) {
  const ivory = useIvory();
  const { level, pct, toNext } = levelFromPoints(entry.total_points);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={ivory ? { y: 8, opacity: 0 } : { y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ivory ? { duration: 0.24, ease: [0.22, 1, 0.36, 1], delay: 0.2 } : { type: "spring", stiffness: 210, damping: 24, delay: 0.35 }}
      className={
        ivory
          ? cn("sticky bottom-3 z-20 mt-4 flex min-h-hec-target w-full items-center gap-3 rounded-hec-lg border border-hec-brass/40 bg-hec-raised px-4 py-3 text-left shadow-hec-2", FOCUS)
          : "studio-focus sticky bottom-3 z-20 mt-4 flex w-full items-center gap-3 rounded-2xl bg-[hsl(var(--studio-ink))] px-3 py-2.5 text-left shadow-studio-lg"
      }
    >
      <Avatar48 entry={entry} ring={ivory ? "hsl(var(--hec-brass))" : "hsl(var(--studio-butter))"} className="h-10 w-10 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className={ivory ? "text-hec-caption font-semibold uppercase tracking-wider text-hec-brass" : "text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[hsl(var(--studio-butter))]"}>
          You · {entry.rank}
          {entry.rank === 1 ? "st" : entry.rank === 2 ? "nd" : entry.rank === 3 ? "rd" : "th"}
        </p>
        <p className={ivory ? "text-hec-small tabular-nums text-hec-ink-soft" : "truncate text-xs text-[hsl(var(--studio-card)/0.75)]"}>
          Level {level} · {toNext} to the next one
        </p>
        <div className={ivory ? "mt-1 h-2 w-full overflow-hidden rounded-full bg-hec-sunken" : "mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--studio-card)/0.18)]"}>
          <div
            className={ivory ? "h-full rounded-full bg-hec-brass" : "h-full rounded-full bg-[hsl(var(--studio-butter))]"}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className={ivory ? "shrink-0 whitespace-nowrap font-sans text-hec-h2 font-semibold tabular-nums text-hec-ink" : "shrink-0 font-studio text-xl font-semibold tabular-nums text-[hsl(var(--studio-card))]"}>
        {entry.total_points}
      </span>
    </motion.button>
  );
}
