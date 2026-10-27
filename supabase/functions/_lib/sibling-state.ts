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
  // compute-sibling-discounts holds a per-month lock, so parallel tuition
  // requests (overview, sibling attendance saves) can find it busy. A busy lock
  // means another request is already resolving this month: wait for it and
  // read the result instead of failing the whole tuition calculation.
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await supabase.functions.invoke('compute-sibling-discounts', {
      body: { month, familyIds: missing },
    });
    if (error) throw error;
    if (data?.success) return load();
    if (!/already running/i.test(String(data?.reason ?? ''))) {
      throw new Error(data?.reason || 'Family discount calculation failed');
    }
    await new Promise(r => setTimeout(r, 750 * (attempt + 1)));
    const now = await load();
    if (missing.every(id => now.some((s: any) => s.family_id === id && s.status !== 'pending'))) return now;
  }
  // Still busy: return whatever is stored (as before this resolver existed);
  // a missing row is never treated as ineligible, and the next call resolves it.
  return load();
}
