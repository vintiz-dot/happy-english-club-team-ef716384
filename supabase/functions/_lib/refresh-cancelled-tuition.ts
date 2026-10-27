// Refresh persisted bills through the canonical calculator after cancellation.
export async function refreshCancelledTuition(supabase: any, sessions: Array<{ id: string; date: string }>): Promise<void> {
  if (!sessions.length) return;
  const { data: attendance, error } = await supabase.from('attendance')
    .select('session_id, student_id').in('session_id', sessions.map(s => s.id));
  if (error) throw error;
  const monthBySession = new Map(sessions.map(s => [s.id, s.date.slice(0, 7)]));
  const keys = new Set<string>();
  for (const row of attendance ?? []) {
    const month = monthBySession.get(row.session_id);
    if (month) keys.add(`${row.student_id}:${month}`);
  }
  for (const key of keys) {
    const [studentId, month] = key.split(':');
    const { data, error: refreshError } = await supabase.functions.invoke('calculate-tuition', { body: { studentId, month } });
    if (refreshError || data?.error || data?.siblingUnresolved) throw new Error('Lesson cancelled, but tuition refresh failed. Retry before collecting payment.');
  }
}