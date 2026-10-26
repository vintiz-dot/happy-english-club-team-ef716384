// Resolve missing/pending assignments in one family-scoped call. Never reassign
// an existing winner, and never turn a calculation failure into ineligibility.
export async function resolveSiblingStates(supabase: any, familyIds: string[], month: string, resolve = true) {
  const ids = [...new Set(familyIds.filter(Boolean))];
  if (!ids.length) return [];
  const load = async () => {
    const { data, error } = await supabase.from('sibling_discount_state')
      .select('family_id, status, winner_student_id, winner_class_id, sibling_percent, reason')
      .in('family_id', ids).eq('month', month);
    if (error) throw error;
    return data || [];
  };
  const states = await load();
  if (!resolve) return states;
  const missing = ids.filter(id => !states.some((s: any) => s.family_id === id && s.status !== 'pending'));
  if (!missing.length) return states;
  const { data, error } = await supabase.functions.invoke('compute-sibling-discounts', {
    body: { month, familyIds: missing },
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.reason || 'Family discount calculation failed');
  return load();
}