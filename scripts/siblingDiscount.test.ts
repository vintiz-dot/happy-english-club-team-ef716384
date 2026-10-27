import { describe, expect, test } from 'bun:test';
import { resolveSiblingStates } from '../supabase/functions/_lib/sibling-state';
import { siblingDiscountView } from '../src/lib/siblingDiscountView';

const assigned = { family_id: 'susan-family', status: 'assigned', winner_student_id: 'susan', winner_class_id: 'venus', sibling_percent: 5 };
function client(initial: any[], success = true) {
  let states = initial;
  const calls: any[] = [];
  const sb = {
    from: () => ({ select: () => ({ in: () => ({ eq: async () => ({ data: states }) }) }) }),
    functions: { invoke: async (name: string, options: any) => {
      calls.push({ name, ...options });
      if (success) states = [assigned];
      return { data: { success } };
    } },
  };
  return { sb, calls };
}
describe('family discount regression', () => {
  test('missing October assignment is resolved only for the affected family', async () => {
    const { sb, calls } = client([]);
    expect(await resolveSiblingStates(sb, ['susan-family'], '2026-10')).toEqual([assigned]);
    expect(calls).toEqual([{ name: 'compute-sibling-discounts', body: { month: '2026-10', familyIds: ['susan-family'] } }]);
  });
  test('existing assigned winner is never recomputed by a tuition read', async () => {
    const { sb, calls } = client([assigned]);
    await resolveSiblingStates(sb, ['susan-family'], '2026-10');
    expect(calls.length).toBe(0);
  });
  test('internal preview cannot trigger recursive discount assignment', async () => {
    const { sb, calls } = client([]);
    expect(await resolveSiblingStates(sb, ['susan-family'], '2026-10', false)).toEqual([]);
    expect(calls.length).toBe(0);
  });
  test('failed computation is not reported as no discount', async () => {
    const { sb } = client([], false);
    await expect(resolveSiblingStates(sb, ['susan-family'], '2026-10')).rejects.toThrow('Family discount calculation failed');
  });
  test('lock still busy after waiting: family is unresolved, never treated as no discount', async () => {
    let calls = 0;
    const sb = {
      from: () => ({ select: () => ({ in: () => ({ eq: async () => ({ data: [] }) }) }) }),
      functions: { invoke: async () => { calls++; return { data: { success: false, reason: 'Job already running for this month' } }; } },
    };
    const realTimeout = globalThis.setTimeout;
    (globalThis as any).setTimeout = (fn: any) => realTimeout(fn, 0);
    try {
      const states = await resolveSiblingStates(sb, ['susan-family'], '2026-10');
      expect(states).toHaveLength(1);
      expect(states[0].family_id).toBe('susan-family');
      expect(states[0].status).toBe('unresolved');
      expect(calls).toBe(4);
    } finally { (globalThis as any).setTimeout = realTimeout; }
  });
  test('a family resolved by the other request while waiting is returned as assigned', async () => {
    let states: any[] = [];
    const sb = {
      from: () => ({ select: () => ({ in: () => ({ eq: async () => ({ data: states }) }) }) }),
      functions: { invoke: async () => { states = [assigned]; return { data: { success: false, reason: 'Job already running for this month' } }; } },
    };
    const realTimeout = globalThis.setTimeout;
    (globalThis as any).setTimeout = (fn: any) => realTimeout(fn, 0);
    try { expect(await resolveSiblingStates(sb, ['susan-family'], '2026-10')).toEqual([assigned]); }
    finally { (globalThis as any).setTimeout = realTimeout; }
  });
  test('5% family discount on 1,890,000 is the returned 94,500, not a new winner selection', () => {
    const view = siblingDiscountView({ siblingState: { status: 'assigned', isWinner: true, percent: 5, winnerClassId: 'venus' },
      discounts: [{ isSiblingWinner: true, amount: 94500 }],
      breakdown: { classes: [{ class_id: 'venus', class_name: 'Venus', sessions_count: 9, amount_vnd: 1890000 },
        { class_id: 'other', class_name: 'Other', sessions_count: 10, amount_vnd: 2100000 }] } });
    expect(view.state.winnerClassId).toBe('venus');
    expect(view.discountAmount).toBe(94500);
    expect(view.classes[0].totalAmount - view.discountAmount).toBe(1795500);
  });
});