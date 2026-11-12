/**
 * Skill points per student for one class: the figures behind "class best",
 * "class average" and the top three on the skill panels.
 *
 * A family's login cannot read classmates' skill_assessments rows (they carry
 * the teacher's comments; migration 20261113130000), so these totals come
 * from `get_class_skill_points`, which returns a name, a skill and a sum and
 * nothing else, and only to the class's own families, staff and admins.
 *
 * The fallback is the query these panels used before that function existed.
 * It keeps a browser that is ahead of the database working: staff get the
 * same rows as ever, and a family gets whatever the row policies still allow.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ClassSkillPoint {
  student_id: string;
  student_name: string;
  skill: string;
  total: number;
}

export async function fetchClassSkillPoints(
  classId: string,
  from?: string | null,
  to?: string | null,
): Promise<ClassSkillPoint[]> {
  const { data: rows, error: rpcError } = await (supabase as any).rpc("get_class_skill_points", {
    p_class: classId,
    p_from: from ?? null,
    p_to: to ?? null,
  });
  if (!rpcError && Array.isArray(rows)) {
    return rows.map((r: any) => ({
      student_id: r.student_id,
      student_name: r.student_name ?? "Unknown",
      skill: r.skill,
      total: Number(r.total ?? 0),
    }));
  }

  let query = supabase
    .from("skill_assessments")
    .select("student_id, skill, score, students(full_name)")
    .eq("class_id", classId);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  const { data, error } = await query;
  if (error) throw error;

  const byKey = new Map<string, ClassSkillPoint>();
  for (const entry of (data ?? []) as any[]) {
    const key = `${entry.student_id}|${entry.skill}`;
    const student = Array.isArray(entry.students) ? entry.students[0] : entry.students;
    const row = byKey.get(key) ?? {
      student_id: entry.student_id,
      student_name: student?.full_name || "Unknown",
      skill: entry.skill,
      total: 0,
    };
    row.total += Number(entry.score ?? 0);
    byKey.set(key, row);
  }
  return [...byKey.values()];
}
