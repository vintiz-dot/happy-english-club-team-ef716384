import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recordedLessonState, type RecordedLessonState } from "@/lib/recordedLessonState";

/**
 * "Recorded in class": every lesson the Class recorder has touched in the last three weeks, with
 * what happened to it - how much was recorded, whether the recording failed, whether it is queued
 * for the school laptop to transcribe, and whether the transcript is ready (owner, 25 Nov 2026).
 * Read through the teacher's own session, so the recorder's own policy decides what is listed (an
 * admin, the class's standing teacher, the teacher of that lesson). It never touches the audio and
 * sends nothing anywhere: recorder audio is processed on the school laptop
 * (docs/LESSON_MONITOR_DESIGN.md, Option A), not by this screen. Every source is read untyped and
 * is optional: a table the person may not read leaves its part out (for a teacher the laptop's
 * refusals are not readable, so a lesson that was refused shows as waiting).
 * The decisions are in src/lib/recordedLessonState.ts (pure, tested).
 */
interface Row {
  id: string; class_id: string; session_id: string | null; session_date: string; status: string;
  scheduled_start: string | null; scheduled_end: string | null; started_at: string | null; completed_at: string | null;
  abandon_reason: string | null; audio_deleted_at: string | null; className: string;
  recordedS: number | null; state: RecordedLessonState;
}

const TONE: Record<RecordedLessonState["tone"], { icon: typeof Clock; cls: string }> = {
  good: { icon: CheckCircle2, cls: "text-emerald-700" },
  wait: { icon: Clock, cls: "text-sky-700" },
  bad: { icon: AlertTriangle, cls: "text-rose-700" },
};

const minutes = (s: number | null) => (s == null ? "" : `${Math.round(s / 60)} min`);

export function RecordedInClass({ userId, onAddTranscript }: { userId: string; onAddTranscript: (classId: string, sessionId: string | null) => void }) {
  const q = useQuery<Row[]>({
    queryKey: ["recorded-in-class", userId],
    refetchInterval: 60_000,
    queryFn: async () => {
      const c: any = supabase;
      const from = new Date(Date.now() + 7 * 3600_000 - 21 * 86400_000).toISOString().slice(0, 10);
      const { data, error } = await c.from("class_recordings")
        .select("id, class_id, session_id, session_date, status, scheduled_start, scheduled_end, started_at, completed_at, abandon_reason, audio_deleted_at")
        .eq("purpose", "lesson").neq("status", "armed").gte("session_date", from)
        .order("session_date", { ascending: false }).limit(30);
      if (error) throw new Error(String(error.message ?? error));
      const rows: any[] = data ?? [];
      if (!rows.length) return [];
      const ids = rows.map((r) => r.id);
      const classIds = [...new Set(rows.map((r) => r.class_id))];
      const soft = async (p: PromiseLike<{ data: any[] | null; error: unknown }>) => { try { const r = await p; return r.error ? null : r.data ?? []; } catch { return null; } };
      const [cls, chunks, reports, runs] = await Promise.all([
        soft(c.from("classes").select("id, name").in("id", classIds)),
        soft(c.from("class_recording_chunks").select("recording_id, t_end_ms, confirmed_at").in("recording_id", ids).not("confirmed_at", "is", null)),
        soft(c.from("lesson_monitor_reports").select("recording_id").in("recording_id", ids)),
        soft(c.from("lesson_monitor_runs").select("recording_id, outcome, reason").in("recording_id", ids)),
      ]);
      const name = new Map<string, string>((cls ?? []).map((x: any) => [x.id, x.name]));
      const endMs = new Map<string, number>();
      for (const k of chunks ?? []) endMs.set(k.recording_id, Math.max(endMs.get(k.recording_id) ?? 0, Number(k.t_end_ms) || 0));
      const reported = new Set<string>((reports ?? []).map((x: any) => x.recording_id));
      const run = new Map<string, { outcome: string; reason: string | null }>((runs ?? []).map((x: any) => [x.recording_id, x]));
      return rows.map((r) => {
        const recordedS = chunks ? (endMs.has(r.id) ? Math.round(endMs.get(r.id)! / 1000) : 0) : null;
        const lessonS = r.scheduled_start && r.scheduled_end ? Math.round((Date.parse(r.scheduled_end) - Date.parse(r.scheduled_start)) / 1000) : null;
        return {
          ...r, className: name.get(r.class_id) ?? "A class", recordedS,
          state: recordedLessonState({
            status: r.status, abandonReason: r.abandon_reason, audioDeleted: !!r.audio_deleted_at,
            hasReport: reported.has(r.id), run: run.get(r.id) ?? null, recordedS, lessonS,
          }),
        } as Row;
      });
    },
  });
  const rows = q.data ?? [];
  if (q.isError || !rows.length) return null; // no recordings (or none readable): nothing to say

  const queued = rows.filter((r) => r.state.key === "queued").length;

  return (
    <Card data-recorded-in-class="">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Mic className="h-4 w-4" aria-hidden /> Recorded in class</CardTitle>
        <p className="text-sm text-muted-foreground">
          The audio is transcribed on the school laptop, overnight, and never leaves it. {queued > 0
            ? `${queued} lesson${queued === 1 ? " is" : "s are"} waiting in the queue for tonight.`
            : "Nothing is waiting in the queue."} Once a lesson's transcript is saved its audio is deleted from the server within a few hours.
          If a lesson failed or the laptop does not cover it, paste a transcript yourself.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="divide-y text-sm">
          {rows.map((r) => {
            const T = TONE[r.state.tone];
            return (
              <li key={r.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="font-medium">{r.className}</span>
                  <span className="text-muted-foreground"> · {r.session_date}</span>
                  <span className={`flex items-center gap-1.5 ${T.cls}`}><T.icon className="h-4 w-4 shrink-0" aria-hidden />{r.state.text}</span>
                  {r.recordedS != null && r.recordedS > 0 && <span className="block text-xs text-muted-foreground">{minutes(r.recordedS)} recorded{r.state.lessonMin ? ` of a ${r.state.lessonMin} min lesson` : ""}</span>}
                </span>
                {r.state.canPaste && (
                  <Button size="sm" variant="outline" className="min-h-9" onClick={() => onAddTranscript(r.class_id, r.session_id)}>Paste a transcript</Button>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
