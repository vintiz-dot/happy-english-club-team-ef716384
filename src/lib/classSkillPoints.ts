/**
 * Class skill figures: what stands behind "class best", "class average" and
 * the top three on a child's skill panels.
 *
 * A family's login cannot read classmates' skill_assessments rows - they
 * carry the teacher's comments (migration 20261113130000) - and it is not
 * given classmates' totals by name either (20261113150000). What a family
 * gets is `get_class_skill_summary`: per skill, the best total, the sum and
 * how many children it is over, and the three highest totals as bare
 * numbers. No child is named and nothing ties one skill to another.
 *
 * Staff (teachers, TAs, admins) read the class's rows themselves, so for
 * them the figures are built from rows and the top three keep their names.
 *
 * The fallbacks keep a browser that is ahead of the database working:
 *   summary missing -> `get_class_skill_points` (the database between the two
 *   migrations) -> the row query these panels used before either existed.
 * A fallback is taken ONLY when the database says the function is not there.
 * Any other failure (the network, a timeout) is thrown: once the migrations
 * are in, the row query returns the family's own rows alone, and figures
 * built from those would show the child as best in class.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ClassSkillTop {
  total: number;
  /** Only when the viewer may know it (staff, or an older database). */
  name: string | null;
  studentId: string | null;
}

export interface ClassSkillSummary {
  /** Highest total for the skill. */
  best: number;
  /** Sum of every child's total for the skill. */
  total: number;
  /** Children with at least one assessment in the skill. */
  students: number;
  /** The three highest totals, highest first. */
  top: ClassSkillTop[];
}

export interface ClassSkillFigures {
  bySkill: Record<string, ClassSkillSummary>;
  /** Children in the class with any assessment in the range. */
  classStudents: number;
}

interface PerStudent {
  student_id: string;
  student_name: string | null;
  skill: string;
  total: number;
}

/** PostgREST's "no such function" (PGRST202), or Postgres's own (42883). */
function functionMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "PGRST202" || error.code === "42883" || /could not find the function/i.test(error.message ?? "");
}

function fromPerStudent(rows: PerStudent[]): ClassSkillFigures {
  const bySkill: Record<string, ClassSkillSummary> = {};
  const everyone = new Set<string>();
  const perSkill = new Map<string, Map<string, { total: number; name: string | null }>>();
  for (const r of rows) {
    everyone.add(r.student_id);
    const m = perSkill.get(r.skill) ?? new Map();
    const cur = m.get(r.student_id) ?? { total: 0, name: r.student_name };
    cur.total += Number(r.total ?? 0);
    m.set(r.student_id, cur);
    perSkill.set(r.skill, m);
  }
  for (const [skill, m] of perSkill) {
    const sorted = [...m.entries()].sort((a, b) => b[1].total - a[1].total);
    bySkill[skill] = {
      best: sorted[0]?.[1].total ?? 0,
      total: sorted.reduce((sum, [, v]) => sum + v.total, 0),
      students: sorted.length,
      top: sorted.slice(0, 3).map(([studentId, v]) => ({ total: v.total, name: v.name, studentId })),
    };
  }
  return { bySkill, classStudents: everyone.size };
}

async function fromRows(classId: string, from?: string | null, to?: string | null): Promise<ClassSkillFigures> {
  let query = supabase
    .from("skill_assessments")
    .select("student_id, skill, score, students(full_name)")
    .eq("class_id", classId);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  const { data, error } = await query;
  if (error) throw error;
  return fromPerStudent(
    ((data ?? []) as any[]).map((entry) => {
      const student = Array.isArray(entry.students) ? entry.students[0] : entry.students;
      return {
        student_id: entry.student_id,
        student_name: student?.full_name ?? null,
        skill: entry.skill,
        total: Number(entry.score ?? 0),
      };
    }),
  );
}

export async function fetchClassSkillFigures(
  classId: string,
  opts: { from?: string | null; to?: string | null; staff?: boolean } = {},
): Promise<ClassSkillFigures> {
  const from = opts.from ?? null;
  const to = opts.to ?? null;

  // Staff may read the class's rows, names included.
  if (opts.staff) return fromRows(classId, from, to);

  const args = { p_class: classId, p_from: from, p_to: to };
  const summary = await (supabase as any).rpc("get_class_skill_summary", args);
  if (!summary.error && Array.isArray(summary.data)) {
    const bySkill: Record<string, ClassSkillSummary> = {};
    let classStudents = 0;
    for (const r of summary.data as any[]) {
      classStudents = Math.max(classStudents, Number(r.class_students ?? 0));
      bySkill[r.skill] = {
        best: Number(r.best ?? 0),
        total: Number(r.total ?? 0),
        students: Number(r.students ?? 0),
        top: (Array.isArray(r.top) ? r.top : []).map((t: unknown) => ({ total: Number(t ?? 0), name: null, studentId: null })),
      };
    }
    return { bySkill, classStudents };
  }
  if (!functionMissing(summary.error)) throw summary.error ?? new Error("class skill summary: unexpected answer");

  const named = await (supabase as any).rpc("get_class_skill_points", args);
  if (!named.error && Array.isArray(named.data)) {
    return fromPerStudent(
      (named.data as any[]).map((r) => ({
        student_id: r.student_id,
        student_name: r.student_name ?? null,
        skill: r.skill,
        total: Number(r.total ?? 0),
      })),
    );
  }

  if (!functionMissing(named.error)) throw named.error ?? new Error("class skill points: unexpected answer");

  return fromRows(classId, from, to);
}
