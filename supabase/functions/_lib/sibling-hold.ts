/**
 * _lib/sibling-hold.ts — children on hold for the family sibling discount.
 *
 * students.sibling_discount_from is the first day a child counts for it
 * (supabase/migrations/20261107090000). Before that the family is worked
 * out as if the child were not in it: a sibling already getting the
 * discount keeps it, and a lone sibling does not gain one because of the
 * new child. Both places that decide who counts - compute-sibling-discounts
 * and projectedByFamilyPerClass behind watch-sibling-threshold - ask here.
 */

/** Is a child with this hold left out of the family discount for `month` (YYYY-MM)? */
export function heldOutOfSiblingDiscount(from: string | null | undefined, month: string): boolean {
  return typeof from === "string" && from.slice(0, 7) > month;
}

/**
 * The children of these families who are on hold for `month`.
 *
 * Tolerates the column not existing yet: migrations are pasted by hand and
 * this may deploy first, and with no column nobody can be on hold. Any
 * other failure throws, because guessing "nobody" would give a held
 * child's family a discount it should not have.
 */
export async function siblingHolds(supabase: any, familyIds: string[], month: string): Promise<Set<string>> {
  const ids = [...new Set(familyIds.filter(Boolean))];
  if (!ids.length) return new Set();
  const { data, error } = await supabase
    .from("students")
    .select("id, sibling_discount_from")
    .in("family_id", ids)
    .not("sibling_discount_from", "is", null);
  if (error) {
    if (error.code === "42703" || /sibling_discount_from/.test(String(error.message ?? ""))) return new Set();
    throw error;
  }
  return new Set(
    (data ?? [])
      .filter((s: any) => heldOutOfSiblingDiscount(s.sibling_discount_from, month))
      .map((s: any) => s.id as string),
  );
}
