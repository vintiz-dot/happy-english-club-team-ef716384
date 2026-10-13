/**
 * Turning the leaderboard's existing rows into what a display board needs.
 *
 * The boards ask for three things the old one never showed: a biggest
 * climber, a streak, and a champion per category. Two of those are free
 * and one is not, which is why this file is careful about the difference.
 *
 *  - Champions come straight out of the rows already on screen. No query.
 *  - The climber and the streak need the per-award ledger,
 *    `point_transactions`, because `student_points` is one row per month
 *    and cannot answer "this week" or "three days running". That query is
 *    permitted for staff and not for students, so it is allowed to fail:
 *    `ledgerAvailable` goes false and those two panels stand down rather
 *    than showing a zero that looks like a fact.
 *
 * What this deliberately does NOT use is `student_attendance_streaks
 * .consecutive_days`. The column exists and would have been the obvious
 * source, but nothing ever resets it — mark-attendance only increments —
 * so it drifts upward forever and would put an invented number on a wall
 * in front of a class. The streak here is computed from the ledger: days
 * in a row on which the student actually earned something.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BoardEntry } from "@/components/shared/PodiumBoard";
import {
  BOARD_CATEGORIES,
  colorFor,
  initialOf,
  levelOf,
  shortNameOf,
  type BoardCategory,
  type BoardExtras,
  type BoardRow,
} from "./types";

/* --------------------------------------------------------------- rows */

export function useBoardRows(
  entries: BoardEntry[],
  activeCategory: BoardCategory["key"] | null,
  opts: { monitorStudentId?: string | null; currentStudentId?: string } = {},
): BoardRow[] {
  return useMemo(() => {
    const scored = entries.map((e) => {
      const categories = {
        homework: Number(e.homework_points ?? 0),
        participation: Number(e.participation_points ?? 0),
        reading_theory: Number(e.reading_theory_points ?? 0),
        // Not on BoardEntry today. Read defensively so that when the
        // wrapper starts selecting it, this picks it up with no change
        // here — and reports 0 rather than NaN until then.
        vocabulary_quiz: Number(
          (e as unknown as { vocabulary_quiz_points?: number }).vocabulary_quiz_points ?? 0,
        ),
      };

      // Filtering by category re-ranks on that category alone, which is
      // the whole point of the tab: "who is best at homework", not "the
      // overall order with one number swapped in".
      const points = activeCategory ? categories[activeCategory] : Number(e.total_points ?? 0);
      const name = e.students?.full_name?.trim() || "Unknown";

      return { entry: e, name, points, categories };
    });

    scored.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

    // Standard competition ranking: equal scores share a rank and the
    // next rank skips. Two children on 115 are both 2nd, and nobody is
    // 3rd — which is what the "Tie!" pill in the designs is for.
    let rank = 0;
    let lastPoints: number | null = null;
    const ranked = scored.map((s, i) => {
      if (lastPoints === null || s.points !== lastPoints) {
        rank = i + 1;
        lastPoints = s.points;
      }
      return { ...s, rank };
    });

    const counts = new Map<number, number>();
    for (const r of ranked) counts.set(r.rank, (counts.get(r.rank) ?? 0) + 1);

    // The bar for the podium is third place's score. Anyone already on
    // the podium needs nothing.
    const thirdScore = ranked.find((r) => r.rank === 3)?.points
      ?? ranked[ranked.length - 1]?.points
      ?? 0;

    return ranked.map((r): BoardRow => {
      const { level, pct } = levelOf(Number(r.entry.total_points ?? 0));
      return {
        studentId: r.entry.student_id,
        name: r.name,
        shortName: shortNameOf(r.name),
        initial: initialOf(r.name),
        avatarUrl: r.entry.students?.avatar_url ?? null,
        rank: r.rank,
        tied: (counts.get(r.rank) ?? 0) > 1,
        points: r.points,
        level,
        levelPct: pct,
        categories: r.categories,
        toPodium: r.rank <= 3 ? 0 : Math.max(0, thirdScore - r.points + 1),
        color: colorFor(r.entry.student_id),
        isMonitor: opts.monitorStudentId === r.entry.student_id,
        isSelf: opts.currentStudentId === r.entry.student_id,
      };
    });
  }, [entries, activeCategory, opts.monitorStudentId, opts.currentStudentId]);
}

/* ------------------------------------------------------------- extras */

interface LedgerRow {
  student_id: string;
  points: number;
  date: string;
}

export function useBoardExtras(
  classId: string,
  rows: BoardRow[],
  /** Skip the ledger query where it is known to be disallowed. */
  canReadLedger: boolean,
): BoardExtras {
  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 27);
    return d.toISOString().slice(0, 10);
  }, []);

  const { data: ledger, isError } = useQuery<LedgerRow[]>({
    queryKey: ["board-ledger", classId, since],
    enabled: !!classId && canReadLedger,
    staleTime: 60_000,
    // A student hitting this gets an RLS empty set or an error; either
    // way the panels stand down rather than retrying in a loop.
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("point_transactions")
        .select("student_id, points, date")
        .eq("class_id", classId)
        .gte("date", since)
        .order("date", { ascending: false })
        .limit(4000);
      if (error) throw error;
      return (data ?? []) as LedgerRow[];
    },
  });

  return useMemo<BoardExtras>(() => {
    const byId = new Map(rows.map((r) => [r.studentId, r]));

    /* champions — always available, straight from the rows */
    const champions = BOARD_CATEGORIES.map((category) => {
      let best: BoardRow | null = null;
      for (const r of rows) {
        if (r.categories[category.key] <= 0) continue;
        if (!best || r.categories[category.key] > best.categories[category.key]) best = r;
      }
      return best
        ? {
            category,
            studentId: best.studentId,
            name: best.name,
            points: best.categories[category.key],
            color: best.color,
            initial: best.initial,
          }
        : null;
    }).filter(Boolean) as BoardExtras["champions"];

    if (!canReadLedger || isError || !ledger) {
      return { champions, ledgerAvailable: false, climber: null, streak: null };
    }

    /* climber — biggest gain over the last seven days */
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekKey = weekAgo.toISOString().slice(0, 10);

    const gains = new Map<string, number>();
    for (const t of ledger) {
      if (t.date < weekKey) continue;
      gains.set(t.student_id, (gains.get(t.student_id) ?? 0) + Number(t.points ?? 0));
    }
    let climber: BoardExtras["climber"] = null;
    for (const [id, gain] of gains) {
      const row = byId.get(id);
      if (!row || gain <= 0) continue;
      if (!climber || gain > climber.gain) {
        climber = { studentId: id, name: row.name, gain, color: row.color, initial: row.initial };
      }
    }

    /* streak — the longest run of consecutive days earning points */
    const daysBy = new Map<string, Set<string>>();
    for (const t of ledger) {
      if (Number(t.points ?? 0) <= 0) continue;
      const set = daysBy.get(t.student_id) ?? new Set<string>();
      set.add(t.date);
      daysBy.set(t.student_id, set);
    }

    let streak: BoardExtras["streak"] = null;
    for (const [id, days] of daysBy) {
      const row = byId.get(id);
      if (!row) continue;
      const sorted = [...days].sort();
      let best = 1;
      let run = 1;
      for (let i = 1; i < sorted.length; i += 1) {
        const prev = new Date(sorted[i - 1] + "T00:00:00Z").getTime();
        const cur = new Date(sorted[i] + "T00:00:00Z").getTime();
        run = cur - prev === 86_400_000 ? run + 1 : 1;
        if (run > best) best = run;
      }
      if (best > 1 && (!streak || best > streak.days)) {
        streak = { studentId: id, name: row.name, days: best, color: row.color, initial: row.initial };
      }
    }

    return { champions, climber, streak, ledgerAvailable: true };
  }, [rows, ledger, isError, canReadLedger]);
}
