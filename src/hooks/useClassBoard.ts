/**
 * One class board, for one period, from the server.
 *
 * Staff call `leaderboard_board` directly (it checks admin or teacher of
 * the class). Children and families go through the `class-leaderboard`
 * function, which decides whether the viewer may see the class and calls
 * the same calculation with classmates trimmed to name, avatar and points.
 * Either way the screen renders what comes back.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  hanoiToday,
  isMissingFunction,
  legacyMonthOf,
  legacyToBoard,
  periodKey,
  type LegacyEntry,
  type PeriodChoice,
  type ServerBoard,
  type ServerCategory,
} from "@/lib/leaderboard/board";

export type BoardAudience = "staff" | "family";

export interface ClassBoardResult {
  board: ServerBoard;
  /** The child the function took the viewer to be (family / student). */
  currentStudentId: string | null;
  /** True when the server predates the engine: month only, fewer fields. */
  legacy: boolean;
}

export class NoTermError extends Error {
  constructor() { super("No term covers that date"); }
}

/** A family asked for a board from before their child joined the class. */
export class BeforeJoinedError extends Error {
  constructor() { super("Before your child joined this class"); }
}

async function viaFunction(classId: string, choice: PeriodChoice, category: ServerCategory | null): Promise<ClassBoardResult> {
  const month = legacyMonthOf(choice, hanoiToday());
  const res = await supabase.functions.invoke("class-leaderboard", {
    body: { classId, period: choice.kind, anchor: choice.anchor, category, ...(month ? { month } : {}) },
  });
  if (res.error) {
    const ctx = (res.error as { context?: Response }).context;
    if (ctx && typeof ctx.status === "number" && ctx.status === 404) {
      // A 404 also means "function not deployed"; only the function's own
      // answer says there is no term.
      const body = await ctx.clone().json().catch(() => null);
      if (body?.error === "no_term") throw new NoTermError();
    }
    if (ctx && typeof ctx.status === "number" && ctx.status === 403) {
      const body = await ctx.clone().json().catch(() => null);
      if (body?.error === "before_joined") throw new BeforeJoinedError();
    }
    throw res.error;
  }
  const d = res.data as { board?: ServerBoard; leaderboard?: LegacyEntry[]; currentStudentId?: string | null };
  if (d?.board) return { board: d.board, currentStudentId: d.currentStudentId ?? null, legacy: false };
  return {
    board: legacyToBoard(d?.leaderboard ?? [], classId, month ?? hanoiToday().slice(0, 7)),
    currentStudentId: d?.currentStudentId ?? null,
    legacy: true,
  };
}

export function useClassBoard(
  classId: string | undefined,
  choice: PeriodChoice,
  audience: BoardAudience,
  /**
   * wall: the projector / class window: staff-opened, class-read, classmate fields only.
   * category: rank the board on one tab, on the server (the screen never ranks).
   */
  opts: { wall?: boolean; category?: ServerCategory | null } = {},
) {
  const wall = !!opts.wall;
  const category = opts.category ?? null;
  const queryClient = useQueryClient();

  const query = useQuery<ClassBoardResult>({
    queryKey: ["class-board", classId, audience, wall ? "wall" : "desk", periodKey(choice), category ?? "all"],
    enabled: !!classId,
    staleTime: 30_000,
    // Keep the board on screen while another tab or period loads.
    placeholderData: (prev) => prev,
    retry: (n, e) => !(e instanceof NoTermError) && !(e instanceof BeforeJoinedError) && n < 1,
    queryFn: async () => {
      if (audience === "staff") {
        const { data, error } = await supabase.rpc("leaderboard_board" as never, {
          p_class: classId, p_period: choice.kind, p_anchor: choice.anchor, p_wall: wall,
          p_category: category,
        } as never);
        if (!error && data) return { board: data as unknown as ServerBoard, currentStudentId: null, legacy: false };
        if (error && (error as { code?: string }).code === "P0002") throw new NoTermError();
        if (!isMissingFunction(error)) throw error;
      }
      return viaFunction(classId!, choice, category);
    },
  });

  // Points awarded anywhere reach every open board of the class: staff,
  // the projector and the children's own screens.
  useEffect(() => {
    if (!classId) return;
    const channel = supabase
      .channel(`class-board-${classId}-${audience}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_points", filter: `class_id=eq.${classId}` },
        () => queryClient.invalidateQueries({ queryKey: ["class-board", classId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [classId, audience, queryClient]);

  return query;
}

/** The terms an admin set. Empty (and the Term choice hidden) until then. */
export function useSchoolTerms() {
  return useQuery({
    queryKey: ["school-terms"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_terms" as never)
        .select("id, name, starts_on, ends_on")
        .order("starts_on", { ascending: false });
      // Before the migration is pasted the table is not there: no terms.
      if (error) return [] as Array<{ id: string; name: string; starts_on: string; ends_on: string }>;
      return (data ?? []) as unknown as Array<{ id: string; name: string; starts_on: string; ends_on: string }>;
    },
  });
}

export interface PointsSummary {
  all_time: number;
  month: number;
  level: { level: number; from: number; next: number; progress: number; to_next: number };
  classes: Array<{ class_id: string; all_time: number; month: number | null }>;
}

/**
 * One child's all-time points, level and per-class totals, from
 * student_points_summary (the same level rule as every board). The level
 * fields are laid out the way the dashboard's hero card takes them.
 */
export function useStudentPointsSummary(studentId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ["student-points-summary", studentId],
    enabled: !!studentId && enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("student_points_summary" as never, {
        p_students: [studentId],
      } as never);
      if (error) throw error;
      const s = (data as unknown as Record<string, PointsSummary>)?.[studentId!] ?? null;
      if (!s) return null;
      const lvl = s.level;
      return {
        ...s,
        hero: {
          level: lvl.level,
          currentXp: Number(s.all_time) - Number(lvl.from),
          nextLevelXp: Number(lvl.next) - Number(lvl.from),
          progress: lvl.progress,
        },
      };
    },
  });
}
