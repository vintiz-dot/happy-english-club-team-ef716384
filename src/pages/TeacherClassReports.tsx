import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ClipboardList, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * /teacher/class-reports - every lesson report a teacher (or TA, or admin) can
 * work on: their lessons of the last three weeks, newest first, each with its
 * report's state, opening the review screen (/teacher/lesson-report/:id).
 * Reads as the caller; RLS decides which drafts and reports show.
 */
const card = "rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-1";
const db = supabase as any;
const DAYS = 21;

type Row = { id: string; date: string; start: string; end: string; className: string; state: "approved" | "ready" | "building" | "failed" | "none" };

async function myLessons(userId: string, isAdmin: boolean): Promise<Row[]> {
  const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const from = new Date(Date.now() + 7 * 3600_000 - DAYS * 86400_000).toISOString().slice(0, 10);
  let q = db.from("sessions").select("id, date, start_time, end_time, status, classes(name)")
    .gte("date", from).lte("date", today).neq("status", "Canceled")
    .order("date", { ascending: false }).order("start_time", { ascending: false }).limit(200);
  if (!isAdmin) {
    const [{ data: t }, { data: ta }] = await Promise.all([
      db.from("teachers").select("id").eq("user_id", userId),
      db.from("teaching_assistants").select("id").eq("user_id", userId),
    ]);
    const tIds = (t ?? []).map((r: any) => r.id);
    const taIds = (ta ?? []).map((r: any) => r.id);
    let taSessions: string[] = [];
    if (taIds.length) {
      const { data: sp } = await db.from("session_participants").select("session_id").in("teaching_assistant_id", taIds);
      taSessions = (sp ?? []).map((r: any) => r.session_id);
    }
    const ors = [
      tIds.length ? `teacher_id.in.(${tIds.join(",")})` : null,
      taSessions.length ? `id.in.(${taSessions.join(",")})` : null,
    ].filter(Boolean);
    if (!ors.length) return [];
    q = q.or(ors.join(","));
  }
  const { data: sessions, error } = await q;
  if (error) throw error;
  const ids = (sessions ?? []).map((s: any) => s.id);
  if (!ids.length) return [];
  const [{ data: drafts }, { data: reports }] = await Promise.all([
    db.from("lesson_report_drafts").select("session_id, status").in("session_id", ids),
    db.from("lesson_reports").select("session_id").in("session_id", ids),
  ]);
  const approved = new Set((reports ?? []).map((r: any) => r.session_id));
  const draft = new Map((drafts ?? []).map((d: any) => [d.session_id, d.status]));
  return (sessions ?? []).map((s: any) => ({
    id: s.id, date: s.date, start: String(s.start_time).slice(0, 5), end: String(s.end_time).slice(0, 5),
    className: s.classes?.name ?? "",
    state: approved.has(s.id) ? "approved" : ((draft.get(s.id) as Row["state"]) ?? "none"),
  }));
}

const LABEL: Record<Row["state"], { text: string; cls: string }> = {
  approved: { text: "Approved - families can see it", cls: "bg-emerald-100 text-emerald-900" },
  ready: { text: "Draft ready to review", cls: "bg-amber-100 text-amber-900" },
  building: { text: "Draft being written", cls: "bg-sky-100 text-sky-900" },
  failed: { text: "Draft failed - rebuild", cls: "bg-rose-100 text-rose-900" },
  none: { text: "No report yet", cls: "bg-hec-sunken text-hec-ink-soft" },
};

export default function TeacherClassReports() {
  const { user, role } = useAuth() as any;
  const lessons = useQuery({
    queryKey: ["teacher-class-reports", user?.id, role],
    queryFn: () => myLessons(user.id, role === "admin"),
    enabled: !!user?.id,
    staleTime: 30_000,
  });
  const rows = lessons.data ?? [];

  return (
    <Layout title="Class reports">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">
        <header className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-hec-lg bg-hec-sunken flex items-center justify-center">
            <ClipboardList className="h-6 w-6 text-hec-ink-soft" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-hec-h1 font-medium text-hec-ink">Class reports</h1>
            <p className="text-sm text-hec-ink-soft">
              Your lessons of the last {DAYS} days. Open one to add photos, build the AI draft, edit it and approve it for families.
            </p>
          </div>
        </header>

        {lessons.isLoading && <p className="flex items-center gap-2 text-hec-ink-soft"><Loader2 className="h-4 w-4 animate-spin" /> Loading your lessons…</p>}
        {lessons.error && <p className="text-rose-700">Your lessons could not be loaded. Reload the page to try again.</p>}
        {!lessons.isLoading && !lessons.error && rows.length === 0 && (
          <p className={`${card} p-4 text-hec-ink-soft`}>No lessons of yours in the last {DAYS} days.</p>
        )}

        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link to={`/teacher/lesson-report/${r.id}`}
                className={`${card} flex items-center gap-3 p-4 min-h-[56px] hover:bg-hec-sunken transition-colors`}>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-hec-ink truncate">{r.className || "Lesson"}</div>
                  <div className="text-sm text-hec-ink-soft">{r.date} · {r.start}-{r.end}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${LABEL[r.state].cls}`}>{LABEL[r.state].text}</span>
                <ChevronRight className="h-5 w-5 shrink-0 text-hec-ink-soft" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}
