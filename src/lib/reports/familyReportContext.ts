/**
 * What the family copy of a progress report prints beside the report itself:
 * the class, its teacher and the CEFR level a teacher APPROVED for this
 * report. Never the model's estimate: that is a staff-only draft until
 * approved (CefrDraftsCard), the same rule get_my_published_reports keeps.
 * Read as the signed-in staff member; any read that fails leaves its part out.
 */
import { supabase } from "@/integrations/supabase/client";

export interface FamilyReportContext {
  className: string | null;
  teacherName: string | null;
  approvedLevel: string | null;
}

export async function familyReportContext(row: { id: string; class_id?: string | null }): Promise<FamilyReportContext> {
  const db = supabase as any;
  const out: FamilyReportContext = { className: null, teacherName: null, approvedLevel: null };
  try {
    const { data } = await db.from("cefr_assessments")
      .select("level, assessed_at")
      .eq("source", "ai_report").eq("source_id", row.id)
      .order("assessed_at", { ascending: false }).limit(1);
    out.approvedLevel = data?.[0]?.level ?? null;
  } catch { /* no level printed */ }
  if (row.class_id) {
    try {
      const { data: cls } = await db.from("classes").select("name, default_teacher_id").eq("id", row.class_id).maybeSingle();
      out.className = cls?.name ?? null;
      if (cls?.default_teacher_id) {
        const { data: t } = await db.from("teachers").select("full_name").eq("id", cls.default_teacher_id).maybeSingle();
        out.teacherName = t?.full_name ?? null;
      }
    } catch { /* no class line */ }
  }
  return out;
}
