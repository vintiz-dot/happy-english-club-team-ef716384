/**
 * The server's board, as the display boards draw it.
 *
 * This used to rank the rows itself, compute a level on its own curve
 * from the month's points, and read the point ledger to find a "climber"
 * and a "streak" - for the last seven and 28 days whatever month was on
 * screen, and with a streak (days in a row earning anything) that was not
 * the streak the school pays a bonus on. Children's screens were not
 * allowed that query at all, so their panels always said "not ready".
 *
 * All of that is now decided once, on the server (`leaderboard_json`), for
 * every viewer and for the period chosen. This file renames and orders.
 */
import { useMemo } from "react";
import type { BoardEntry } from "@/components/shared/PodiumBoard";
import {
  BOARD_KEY_OF,
  SERVER_KEY_OF,
  SERVER_CATEGORIES,
  categoryPoints,
  isTied,
  orderedRows,
  shownPoints,
  shownRank,
  toPodium,
  type ServerBoard,
} from "@/lib/leaderboard/board";
import {
  BOARD_CATEGORIES,
  colorFor,
  initialOf,
  shortNameOf,
  type BoardCategory,
  type BoardExtras,
  type BoardRow,
} from "./types";

export function boardRowsFrom(
  board: ServerBoard | null | undefined,
  activeCategory: BoardCategory["key"] | null,
  opts: { monitorStudentId?: string | null; currentStudentId?: string } = {},
): BoardRow[] {
  if (!board) return [];
  const active = activeCategory ? SERVER_KEY_OF[activeCategory] : null;
  return orderedRows(board, active).map((r): BoardRow => {
    const categories = Object.fromEntries(
      SERVER_CATEGORIES.map((k) => [BOARD_KEY_OF[k], categoryPoints(r, k)]),
    ) as BoardRow["categories"];
    return {
      studentId: r.student_id,
      name: r.name || "Unknown",
      shortName: shortNameOf(r.name || "Unknown"),
      initial: initialOf(r.name || "?"),
      avatarUrl: r.avatar_url ?? null,
      rank: shownRank(r, active),
      tied: isTied(board, r, active),
      points: shownPoints(board, r, active),
      level: r.level?.level ?? 1,
      levelPct: r.level?.progress ?? 0,
      categories,
      toPodium: toPodium(board, r, active),
      color: colorFor(r.student_id),
      isMonitor: !!opts.monitorStudentId && opts.monitorStudentId === r.student_id,
      isSelf: opts.currentStudentId ? opts.currentStudentId === r.student_id : !!r.is_self,
      isNew: !!r.is_new,
    };
  });
}

/**
 * The classic board's entries. Its four pills keep the four stored buckets
 * (video inside homework, streak bonuses inside participation), so they
 * add up to the total beside them; the big number is per lesson on a term
 * or all-time board.
 */
export function toBoardEntries(board: ServerBoard | null | undefined): BoardEntry[] {
  if (!board) return [];
  return orderedRows(board, null).map((r) => ({
    id: `${board.class_id}-${r.student_id}`,
    student_id: r.student_id,
    rank: r.rank,
    total_points: shownPoints(board, r, null),
    homework_points: categoryPoints(r, "homework") + categoryPoints(r, "video"),
    participation_points: categoryPoints(r, "class") + categoryPoints(r, "streak"),
    reading_theory_points: categoryPoints(r, "reading"),
    vocabulary_quiz_points: categoryPoints(r, "vocabulary"),
    is_new: !!r.is_new,
    is_self: !!r.is_self,
    level: r.level ?? null,
    all_time: r.all_time ?? null,
    students: { full_name: r.name, avatar_url: r.avatar_url ?? null },
  }));
}

export function boardExtrasFrom(board: ServerBoard | null | undefined, rows: BoardRow[]): BoardExtras {
  const byId = new Map(rows.map((r) => [r.studentId, r]));
  const look = (id: string, name: string) => {
    const r = byId.get(id);
    return { color: r?.color ?? colorFor(id), initial: r?.initial ?? initialOf(name) };
  };
  const champions = (board?.champions ?? []).flatMap((c) => {
    const category = BOARD_CATEGORIES.find((b) => b.key === BOARD_KEY_OF[c.category]);
    if (!category) return [];
    return [{ category, studentId: c.student_id, name: c.name, points: Number(c.points) || 0, ...look(c.student_id, c.name) }];
  });
  const climber = board?.climber
    ? { studentId: board.climber.student_id, name: board.climber.name, gain: Number(board.climber.gain) || 0,
        ...look(board.climber.student_id, board.climber.name) }
    : null;
  const streak = board?.streak
    ? { studentId: board.streak.student_id, name: board.streak.name, days: Number(board.streak.lessons) || 0,
        ...look(board.streak.student_id, board.streak.name) }
    : null;
  return { champions, climber, streak, ledgerAvailable: !!board };
}

export function useBoardRows(
  board: ServerBoard | null | undefined,
  activeCategory: BoardCategory["key"] | null,
  opts: { monitorStudentId?: string | null; currentStudentId?: string } = {},
): BoardRow[] {
  return useMemo(
    () => boardRowsFrom(board, activeCategory, opts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board, activeCategory, opts.monitorStudentId, opts.currentStudentId],
  );
}

export function useBoardExtras(board: ServerBoard | null | undefined, rows: BoardRow[]): BoardExtras {
  return useMemo(() => boardExtrasFrom(board, rows), [board, rows]);
}
