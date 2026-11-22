import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * The class report, cued for the teacher. When the school laptop has saved a lesson's transcript
 * (lesson_monitor_reports, readable only by that lesson's teacher), the draft class report is built HERE,
 * as the signed-in teacher: lesson-report-draft reads the transcript through the caller's own session, so it
 * only has one when the caller is the lesson's teacher (the laptop's admin sign-in cannot read it).
 * The lesson is then listed as "ready to review" on the lessons page.
 *
 * Built once per lesson per browser (a failed draft is shown, never retried on its own: the server also
 * limits a lesson to 6 builds a day). Untyped client: types.ts lags these tables.
 */
const db = supabase as any;
const DAYS = 21;
const tried = (id: string) => `lesson-report-cue:${id}`;

export type CueState = "ready" | "building" | "failed" | "none";
export interface CueItem { session_id: string; date: string; state: CueState }

async function load(): Promise<CueItem[]> {
  const from = new Date(Date.now() + 7 * 3600_000 - DAYS * 86400_000).toISOString().slice(0, 10);
  const { data: mon, error } = await db.from("lesson_monitor_reports")
    .select("session_id, session_date").gte("session_date", from).not("session_id", "is", null)
    .order("session_date", { ascending: false }).limit(30);
  if (error || !mon?.length) return [];
  const ids = mon.map((m: any) => m.session_id);
  const [{ data: drafts }, { data: approved }] = await Promise.all([
    db.from("lesson_report_drafts").select("session_id, status").in("session_id", ids),
    db.from("lesson_reports").select("session_id").in("session_id", ids),
  ]);
  const done = new Set((approved ?? []).map((a: any) => a.session_id));
  const status = new Map<string, string>((drafts ?? []).map((d: any) => [d.session_id, d.status]));
  return mon.filter((m: any) => !done.has(m.session_id)).map((m: any) => ({
    session_id: m.session_id, date: m.session_date, state: ((status.get(m.session_id) as CueState) ?? "none"),
  }));
}

export function useLessonReportCue(enabled: boolean) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["lesson-report-cue"], enabled, queryFn: load, staleTime: 60_000,
    refetchInterval: (query: any) => ((query.state.data ?? []).some((i: CueItem) => i.state === "building") ? 8000 : false),
  });
  useEffect(() => {
    const todo = (q.data ?? []).filter((i) => i.state === "none");
    for (const i of todo) {
      try { if (localStorage.getItem(tried(i.session_id))) continue; localStorage.setItem(tried(i.session_id), "1"); } catch { /* build anyway */ }
      supabase.functions.invoke("lesson-report-draft", { body: { session_id: i.session_id } })
        .finally(() => qc.invalidateQueries({ queryKey: ["lesson-report-cue"] }));
    }
  }, [q.data, qc]);
  return (q.data ?? []).filter((i) => i.state !== "none");
}
