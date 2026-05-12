/**
 * CEFR level helpers — read the user's current CEFR level from profiles,
 * with a sane default. The supabase-generated types do not yet include the
 * profiles.cefr_level / profiles.school_class columns added in
 * 20260512120000_add_school_class_cefr_to_profiles.sql, so we use untyped
 * client queries here.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

const VALID: Set<CefrLevel> = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

export function isCefrLevel(v: unknown): v is CefrLevel {
  return typeof v === "string" && VALID.has(v as CefrLevel);
}

/**
 * Look up the user's CEFR level from profiles.cefr_level. Returns "A1" if
 * the row doesn't exist, the column is null, or the value is malformed.
 */
export async function getCefrLevel(
  supabase: SupabaseClient,
  userId: string | undefined,
): Promise<CefrLevel> {
  if (!userId) return "A1";
  try {
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("cefr_level")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.warn("getCefrLevel: query error, defaulting to A1:", error.message);
      return "A1";
    }
    return isCefrLevel(data?.cefr_level) ? (data.cefr_level as CefrLevel) : "A1";
  } catch (e) {
    console.warn("getCefrLevel: unexpected error, defaulting to A1:", e);
    return "A1";
  }
}

export async function getSchoolClass(
  supabase: SupabaseClient,
  userId: string | undefined,
): Promise<string | null> {
  if (!userId) return null;
  try {
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("school_class")
      .eq("id", userId)
      .maybeSingle();
    if (error) return null;
    return typeof data?.school_class === "string" ? data.school_class : null;
  } catch {
    return null;
  }
}

/**
 * Save the user's school class + matching CEFR level into profiles.
 * Uses upsert so a missing row gets created.
 */
export async function saveSchoolClass(
  supabase: SupabaseClient,
  userId: string,
  schoolClass: string,
  cefr: CefrLevel,
): Promise<void> {
  await (supabase as any)
    .from("profiles")
    .upsert({ id: userId, school_class: schoolClass, cefr_level: cefr }, { onConflict: "id" });
}
