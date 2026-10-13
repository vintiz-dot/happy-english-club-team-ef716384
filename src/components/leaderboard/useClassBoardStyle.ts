/**
 * Which board a class sees, read and written in one place.
 *
 * This file carried two casts while `classes.leaderboard_style` existed in
 * the database but not yet in the generated types. Those types have since
 * been regenerated, so the column is selected and written by name like any
 * other and the casts are gone.
 *
 * `asStyle` stays, and is not redundant with the column's CHECK: the
 * generated type is `string`, so an older row or a database ahead of this
 * build would otherwise flow through as an unknown style and render
 * nothing. It falls back instead.
 *
 * The hook follows useClassMonitor, the established pattern for a
 * per-class value that both board wrappers need.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BOARD_STYLES, type BoardStyle } from "./types";

export const DEFAULT_BOARD_STYLE: BoardStyle = "podium";

function asStyle(value: unknown): BoardStyle {
  // An unrecognised value means the database is ahead of this build, or a
  // row predates the CHECK. Fall back rather than render nothing.
  return BOARD_STYLES.includes(value as BoardStyle) ? (value as BoardStyle) : DEFAULT_BOARD_STYLE;
}

export interface ClassBoardInfo {
  style: BoardStyle;
  /**
   * The class's own name. Every board wants it in its heading slot, and
   * one of them was being handed the literal word "Leaderboard" instead,
   * so its header read "LEADERBOARD Leaderboard".
   */
  name: string;
}

export function useClassBoardStyle(classId: string | undefined) {
  return useQuery<ClassBoardInfo>({
    queryKey: ["class-board-style", classId],
    enabled: !!classId,
    // The style changes about once a term. Holding it avoids a query on
    // every board mount, and setStyle invalidates it anyway.
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("name, leaderboard_style")
        .eq("id", classId!)
        .maybeSingle();
      if (error) throw error;
      return { style: asStyle(data?.leaderboard_style), name: data?.name ?? "" };
    },
  });
}

/**
 * Save the style. Permitted for an admin, and for a teacher of this class
 * — the database decides which, via enforce_class_update_column_scope.
 * A teacher who is not on this class gets insufficient_privilege, which
 * is translated here into something a person can read.
 */
export async function setClassBoardStyle(classId: string, style: BoardStyle): Promise<void> {
  const { error } = await supabase
    .from("classes")
    .update({ leaderboard_style: style })
    .eq("id", classId);

  if (error) {
    if (error.code === "42501" || /insufficient_privilege/i.test(error.message)) {
      throw new Error(
        "You can only change the board for classes you teach. Ask an admin if this is your class.",
      );
    }
    throw new Error(error.message);
  }
}

/** Invalidate every reader of a class's style after a save. */
export function useInvalidateBoardStyle() {
  const qc = useQueryClient();
  return (classId: string) => {
    qc.invalidateQueries({ queryKey: ["class-board-style", classId] });
  };
}
