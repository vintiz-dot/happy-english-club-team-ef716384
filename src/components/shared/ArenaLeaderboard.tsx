import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { getAvatarUrl, getRandomAvatarUrl } from "@/lib/avatars";
import {
  BookOpen,
  Crown,
  Flag,
  Flame,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogSpendButton } from "@/components/shared/EconomyActions";

export interface ArenaEntry {
  id: string;
  student_id: string;
  rank: number;
  total_points: number;
  homework_points: number;
  participation_points: number;
  reading_theory_points: number;
  students?: { full_name?: string; avatar_url?: string | null } | null;
}

export interface ArenaLeaderboardProps {
  entries: ArenaEntry[];
  classId: string;
  currentStudentId?: string;
  canManagePoints: boolean;
  isEconomyMode: boolean;
  economyCash: Map<string, number> | undefined;
  pendingByStudent: Map<string, number>;
  selectedStudents: Map<string, { id: string; name: string; avatarUrl?: string | null }>;
  onToggleSelect: (
    s: { id: string; name: string; avatarUrl?: string | null },
    e?: React.MouseEvent
  ) => void;
  onOpenAnalytics: (entry: ArenaEntry) => void;
}

// Map rank → tier styling for the top-3 podium.
const TIERS: Record<
  1 | 2 | 3,
  { label: string; aura: string; ring: string; height: string; medal: string }
> = {
  1: {
    label: "CHAMPION",
    aura: "from-amber-300 via-yellow-400 to-orange-500",
    ring: "ring-amber-300",
    height: "h-44 sm:h-52",
    medal: "🥇",
  },
  2: {
    label: "ELITE",
    aura: "from-slate-200 via-gray-300 to-slate-400",
    ring: "ring-slate-200",
    height: "h-36 sm:h-44",
    medal: "🥈",
  },
  3: {
    label: "WARRIOR",
    aura: "from-amber-700 via-orange-500 to-red-600",
    ring: "ring-amber-600",
    height: "h-32 sm:h-40",
    medal: "🥉",
  },
};

function levelFromPoints(p: number) {
  // Simple curve: every level needs ~25 more points than the previous.
  // Level 1 = 0–25, L2 = 26–75, L3 = 76–150, L4 = 151–250, L5 = 251–375 …
  const level = Math.floor((-1 + Math.sqrt(1 + (8 * p) / 25)) / 2) + 1;
  const prev = (25 * (level - 1) * level) / 2;
  const next = (25 * level * (level + 1)) / 2;
  const pct = next === prev ? 0 : Math.min(100, ((p - prev) / (next - prev)) * 100);
  return { level: Math.max(1, level), pct, toNext: Math.max(0, Math.ceil(next - p)) };
}

export function ArenaLeaderboard({
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
}: ArenaLeaderboardProps) {
  const previousRanksRef = useRef<Map<string, number>>(new Map());
  const [movement, setMovement] = useState<Map<string, "up" | "down">>(new Map());

  // Detect rank movement to drive the per-row "rising / falling" shimmer.
  useEffect(() => {
    const prev = previousRanksRef.current;
    const next = new Map<string, "up" | "down">();
    entries.forEach((e) => {
      const old = prev.get(e.student_id);
      if (old != null && old !== e.rank) {
        next.set(e.student_id, e.rank < old ? "up" : "down");
      }
    });
    if (next.size > 0) {
      setMovement(next);
      const t = setTimeout(() => setMovement(new Map()), 2200);
      return () => clearTimeout(t);
    }
    const map = new Map<string, number>();
    entries.forEach((e) => map.set(e.student_id, e.rank));
    previousRanksRef.current = map;
  }, [entries]);

  // Save current ranks AFTER the diff completes (so subsequent renders compare correctly).
  useEffect(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => map.set(e.student_id, e.rank));
    previousRanksRef.current = map;
  }, [entries]);

  const top3 = useMemo(() => entries.slice(0, 3), [entries]);
  const rest = useMemo(() => entries.slice(3), [entries]);

  // Self entry — used for the sticky "you" pinned card at the bottom.
  const self = currentStudentId
    ? entries.find((e) => e.student_id === currentStudentId)
    : null;
  const selfIsOutsideTop = self ? self.rank > 3 : false;

  return (
    <div className="relative">
      {/* Animated aurora background — pure CSS, no JS cost per frame. */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
        <div className="arena-aurora" />
        <div className="arena-grid" />
      </div>

      <div className="relative z-10 px-3 pt-4 pb-6 sm:px-6 sm:pt-6 sm:pb-8">
        {/* HERO — Title bar */}
        <div className="flex items-center justify-between mb-5 sm:mb-7">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-amber-300" />
            <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight text-white">
              The Arena
            </h2>
          </div>
          <Badge className="bg-white/10 text-white border-white/20 backdrop-blur-md text-[11px] sm:text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Live
          </Badge>
        </div>

        {/* PODIUM — order #2, #1, #3 left-to-right (classic podium layout). */}
        {top3.length > 0 && (
          <div className="grid grid-cols-3 items-end gap-2 sm:gap-4 mb-6 sm:mb-8">
            {[top3[1], top3[0], top3[2]].map((entry, idx) => {
              if (!entry) return <div key={idx} />;
              const tier = TIERS[entry.rank as 1 | 2 | 3];
              const isSelf = currentStudentId === entry.student_id;
              return (
                <PodiumCard
                  key={entry.student_id}
                  entry={entry}
                  tier={tier}
                  isSelf={isSelf}
                  isCenter={entry.rank === 1}
                  movement={movement.get(entry.student_id)}
                  onClick={() => onOpenAnalytics(entry)}
                />
              );
            })}
          </div>
        )}

        {/* RANK LIST — ranks 4+ */}
        {rest.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[11px] font-bold tracking-widest text-white/60 uppercase">
                Ranks 4+
              </span>
              <span className="text-[11px] text-white/40">
                {rest.length} {rest.length === 1 ? "player" : "players"}
              </span>
            </div>
            {rest.map((entry, i) => {
              const isSelf = currentStudentId === entry.student_id;
              const isSelected = selectedStudents.has(entry.student_id);
              return (
                <RankRow
                  key={entry.student_id}
                  entry={entry}
                  index={i}
                  isSelf={isSelf}
                  isSelected={isSelected}
                  canManagePoints={canManagePoints}
                  isEconomyMode={isEconomyMode}
                  cash={economyCash?.get(entry.student_id) || 0}
                  pendingCount={pendingByStudent.get(entry.student_id) || 0}
                  movement={movement.get(entry.student_id)}
                  onClick={() => onOpenAnalytics(entry)}
                  onToggleSelect={(e) =>
                    onToggleSelect(
                      {
                        id: entry.student_id,
                        name: entry.students?.full_name || "",
                        avatarUrl: entry.students?.avatar_url,
                      },
                      e
                    )
                  }
                  classId={classId}
                />
              );
            })}
          </div>
        )}

        {entries.length === 0 && (
          <div className="text-center py-12 text-white/60">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No players yet — be the first to score!</p>
          </div>
        )}
      </div>

      {/* "YOU" sticky pinned card — only when student isn't in top 3 */}
      {self && selfIsOutsideTop && (
        <SelfPinnedCard entry={self} onClick={() => onOpenAnalytics(self)} />
      )}
    </div>
  );
}

/* -------------------------------- Podium card -------------------------------- */

interface PodiumCardProps {
  entry: ArenaEntry;
  tier: typeof TIERS[1 | 2 | 3];
  isSelf: boolean;
  isCenter: boolean;
  movement?: "up" | "down";
  onClick: () => void;
}

function PodiumCard({ entry, tier, isSelf, isCenter, movement, onClick }: PodiumCardProps) {
  const { level, pct } = levelFromPoints(entry.total_points);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 30, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 18,
        delay: isCenter ? 0 : 0.12,
      }}
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "group relative flex flex-col items-center justify-end rounded-2xl",
        "bg-gradient-to-b from-white/8 to-white/4 backdrop-blur-sm",
        "border border-white/10 px-2 py-3 sm:px-3 sm:py-4 text-center",
        "min-h-[164px]",
        isCenter && "shadow-[0_0_50px_-10px_rgba(251,191,36,0.5)]"
      )}
    >
      {/* Crown for #1 */}
      {entry.rank === 1 && (
        <motion.div
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
          className="absolute -top-3 left-1/2 -translate-x-1/2"
        >
          <Crown className="h-7 w-7 sm:h-9 sm:w-9 text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
        </motion.div>
      )}

      {/* Avatar with aura */}
      <div className="relative mb-2 sm:mb-3">
        <div
          className={cn(
            "absolute inset-0 -m-1 rounded-full bg-gradient-to-br opacity-70 blur-md",
            tier.aura
          )}
        />
        <Avatar
          className={cn(
            "relative h-14 w-14 sm:h-20 sm:w-20 ring-4",
            tier.ring,
            isCenter && "ring-amber-300 animate-pulse-slow"
          )}
        >
          <AvatarImage
            src={
              getAvatarUrl(entry.students?.avatar_url) ||
              getRandomAvatarUrl(entry.student_id)
            }
            className="object-cover"
          />
          <AvatarFallback className="bg-white/10 text-white font-bold text-lg">
            {entry.students?.full_name?.[0] || "?"}
          </AvatarFallback>
        </Avatar>

        {/* Movement chevron */}
        <AnimatePresence>
          {movement && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className={cn(
                "absolute -top-1 -right-1 h-5 w-5 sm:h-6 sm:w-6 rounded-full text-[10px] sm:text-xs font-extrabold flex items-center justify-center shadow-lg",
                movement === "up"
                  ? "bg-emerald-500 text-white"
                  : "bg-rose-500 text-white"
              )}
            >
              {movement === "up" ? "▲" : "▼"}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Tier label */}
      <div
        className={cn(
          "text-[9px] sm:text-[11px] font-extrabold tracking-[0.15em] mb-1",
          entry.rank === 1
            ? "text-amber-300"
            : entry.rank === 2
            ? "text-slate-200"
            : "text-amber-500"
        )}
      >
        {tier.medal} #{entry.rank} · {tier.label}
      </div>

      {/* Name */}
      <div className="font-bold text-xs sm:text-sm text-white truncate w-full px-1 mb-0.5">
        {entry.students?.full_name}
        {isSelf && <Flag className="inline h-3 w-3 ml-1 text-amber-300 fill-amber-300" />}
      </div>

      {/* Points */}
      <div className="flex items-center gap-1 mb-2">
        <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-300 fill-amber-300" />
        <span className="font-extrabold text-base sm:text-lg text-white tabular-nums">
          {entry.total_points}
        </span>
        <span className="text-[10px] sm:text-xs text-white/50">XP</span>
      </div>

      {/* Level + XP bar */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] sm:text-[10px] text-white/60 font-semibold">
            LV {level}
          </span>
          <span className="text-[9px] sm:text-[10px] text-white/40 tabular-nums">
            {Math.round(pct)}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }}
            className={cn("h-full rounded-full bg-gradient-to-r", tier.aura)}
          />
        </div>
      </div>
    </motion.button>
  );
}

/* --------------------------------- Rank row --------------------------------- */

interface RankRowProps {
  entry: ArenaEntry;
  index: number;
  isSelf: boolean;
  isSelected: boolean;
  canManagePoints: boolean;
  isEconomyMode: boolean;
  cash: number;
  pendingCount: number;
  movement?: "up" | "down";
  onClick: () => void;
  onToggleSelect: (e: React.MouseEvent) => void;
  classId: string;
}

function RankRow({
  entry,
  index,
  isSelf,
  isSelected,
  canManagePoints,
  isEconomyMode,
  cash,
  pendingCount,
  movement,
  onClick,
  onToggleSelect,
  classId,
}: RankRowProps) {
  const { level, pct } = levelFromPoints(entry.total_points);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.3), duration: 0.25 }}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl cursor-pointer transition-all overflow-hidden",
        "bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10",
        isSelf && "ring-2 ring-amber-300/60 bg-amber-300/10",
        isSelected && !isSelf && "ring-2 ring-blue-400/60 bg-blue-400/10",
        movement === "up" && "arena-row-rise",
        movement === "down" && "arena-row-fall"
      )}
      onClick={onClick}
    >
      {/* Selection checkbox */}
      {canManagePoints && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(e);
          }}
          className="shrink-0"
        >
          <Checkbox
            checked={isSelected}
            className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-white/40 bg-white/10 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
          />
        </div>
      )}

      {/* Rank */}
      <div className="w-7 sm:w-9 text-center shrink-0">
        <span className="font-extrabold text-sm sm:text-base text-white/80 tabular-nums">
          #{entry.rank}
        </span>
      </div>

      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className="h-9 w-9 sm:h-11 sm:w-11 ring-2 ring-white/20">
          <AvatarImage
            src={
              getAvatarUrl(entry.students?.avatar_url) ||
              getRandomAvatarUrl(entry.student_id)
            }
            className="object-cover"
          />
          <AvatarFallback className="bg-white/10 text-white font-bold text-xs">
            {entry.students?.full_name?.[0] || "?"}
          </AvatarFallback>
        </Avatar>
        {movement && (
          <span
            className={cn(
              "absolute -top-1 -right-1 h-4 w-4 rounded-full text-[9px] font-extrabold flex items-center justify-center shadow-md",
              movement === "up" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
            )}
          >
            {movement === "up" ? "▲" : "▼"}
          </span>
        )}
      </div>

      {/* Name + breakdown + XP bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-sm sm:text-[15px] text-white truncate">
            {entry.students?.full_name}
          </span>
          {isSelf && (
            <Flag className="h-3 w-3 text-amber-300 fill-amber-300 shrink-0" />
          )}
          {pendingCount > 0 && (
            <Badge className="h-4 px-1.5 text-[9px] bg-amber-400/20 text-amber-200 border-amber-300/30">
              {pendingCount} pending
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] sm:text-[11px] text-white/60">
          <span className="inline-flex items-center gap-0.5" title="Homework">
            <BookOpen className="h-2.5 w-2.5" /> {entry.homework_points}
          </span>
          <span className="inline-flex items-center gap-0.5" title="Participation">
            <Zap className="h-2.5 w-2.5" /> {entry.participation_points}
          </span>
          {entry.reading_theory_points > 0 && (
            <span className="inline-flex items-center gap-0.5" title="Reading Theory">
              <Flame className="h-2.5 w-2.5" /> {entry.reading_theory_points}
            </span>
          )}
          {isEconomyMode && (
            <span className="inline-flex items-center gap-0.5 text-emerald-300" title="Cash">
              💵 {cash}
            </span>
          )}
          <span className="ml-auto text-white/40 hidden sm:inline">LV {level}</span>
        </div>
        {/* XP progress bar */}
        <div className="mt-1.5 h-1 w-full rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 + index * 0.01 }}
            className="h-full rounded-full bg-gradient-to-r from-blue-400 via-sky-400 to-amber-300"
          />
        </div>
      </div>

      {/* Total points */}
      <div className="shrink-0 text-right">
        <div className="flex items-center gap-1 justify-end">
          <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-300 fill-amber-300" />
          <span className="font-extrabold text-sm sm:text-base text-white tabular-nums">
            {entry.total_points}
          </span>
        </div>
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

/* ----------------------------- Self pinned card ----------------------------- */

function SelfPinnedCard({ entry, onClick }: { entry: ArenaEntry; onClick: () => void }) {
  const { level, pct, toNext } = levelFromPoints(entry.total_points);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.5 }}
      className="sticky bottom-3 left-3 right-3 z-20 mx-3 sm:mx-6 mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-500 via-sky-500 to-amber-400 p-0.5 shadow-2xl"
    >
      <div className="flex w-full items-center gap-3 rounded-[14px] bg-slate-900/95 px-3 py-2.5 backdrop-blur-md">
        <Avatar className="h-10 w-10 ring-2 ring-amber-300 shrink-0">
          <AvatarImage
            src={
              getAvatarUrl(entry.students?.avatar_url) ||
              getRandomAvatarUrl(entry.student_id)
            }
          />
          <AvatarFallback className="bg-white/10 text-white text-xs font-bold">
            {entry.students?.full_name?.[0] || "Y"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              You · #{entry.rank}
            </span>
            <Flag className="h-3 w-3 text-amber-300 fill-amber-300" />
          </div>
          <div className="text-[11px] text-white/70 truncate">
            LV {level} · {toNext} XP to next level
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 to-sky-400"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Star className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
          <span className="font-extrabold text-sm text-white tabular-nums">
            {entry.total_points}
          </span>
        </div>
      </div>
    </motion.button>
  );
}
