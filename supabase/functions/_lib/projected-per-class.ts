import { siblingHolds } from './sibling-hold.ts'

// Get per-class tuition breakdown for a family
export async function projectedByFamilyPerClass(supabase: any, familyId: string, ym: string) {
  const { data: familyStudents } = await supabase
    .from('students')
    .select('id')
    .eq('family_id', familyId)
    .eq('is_active', true);

  // A child on a sibling-discount hold does not count until it ends.
  const held = await siblingHolds(supabase, [familyId], ym);
  const students = (familyStudents ?? []).filter((s: any) => !held.has(s.id));

  if (!students || students.length === 0) {
    return [];
  }
  
  // Get enrollments with class info for the target month
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('student_id, class_id, classes(id, name, session_rate_vnd)')
    .in('student_id', students.map((s: any) => s.id))
    .lte('start_date', `${ym}-31`)
    .or(`end_date.is.null,end_date.gte.${ym}-01`);
  
  if (!enrollments || enrollments.length === 0) {
    return [];
  }
  
  const result = [];
  
  // For each enrollment, get projected sessions
  for (const enrollment of enrollments) {
    const { data: projectedData } = await supabase
      .from('v_projected_base')
      .select('student_id, ym, projected_sessions, projected_base')
      .eq('ym', ym)
      .eq('student_id', enrollment.student_id);
    
    if (projectedData && projectedData.length > 0) {
      // Calculate per-class amount based on sessions
      const totalProjected = projectedData[0].projected_base;
      const totalSessions = projectedData[0].projected_sessions;
      
      // Get sessions for this specific class in this month
      const monthStart = `${ym}-01`;
      const nextMonth = new Date(monthStart);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const monthEnd = new Date(nextMonth.getTime() - 1).toISOString().split('T')[0];
      
      const { data: classSessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('class_id', enrollment.class_id)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .neq('status', 'Canceled');
      
      const classSessionCount = classSessions?.length || 0;
      const classRate = enrollment.classes?.session_rate_vnd || 0;
      const classProjectedBase = classSessionCount * classRate;
      
      result.push({
        student_id: enrollment.student_id,
        class_id: enrollment.class_id,
        class_name: enrollment.classes?.name || 'Unknown',
        projected_sessions: classSessionCount,
        projected_base: classProjectedBase,
        session_rate: classRate
      });
    }
  }
  
  return result;
}

// Get highest-tuition class per student for a family
export async function getHighestClassPerStudent(supabase: any, familyId: string, ym: string) {
  const perClassData = await projectedByFamilyPerClass(supabase, familyId, ym);
  
  // Group by student and find highest
  const studentHighest = new Map();
  
  for (const row of perClassData) {
    const current = studentHighest.get(row.student_id);
    if (!current || row.projected_base > current.projected_base) {
      studentHighest.set(row.student_id, row);
    }
  }
  
  return Array.from(studentHighest.values());
}
