import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CircleDot, Loader2, MicOff, Undo2, Users, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { NOBODY, offsetLabel, stateOf, tap, type SpeakerKind, type SpeakerState } from "@/lib/speakerMarks";

/**
 * /teacher/speakers/:sessionId - "Who's speaking". A TA (or the teacher) taps
 * who is talking during a recorded lesson; each tap is a row in
 * lesson_speaker_marks (20261121140000) stamped by the server with the time and
 * the offset into the lesson's recording. Staff of the lesson only.
 * /teacher/speakers lists today's lessons to pick from.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface Kid { student_id: string; full_name: string; avatar_url: string | null }
interface Mark { id: string; kind: SpeakerKind; student_ids: string[] | null; at: string; offset_ms: number | null }

const hanoiToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
const hhmmss = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(iso));

export default function LessonSpeakers() {
  const { sessionId } = useParams();
  return (
    <Layout title="Who's speaking">
      <div className="max-w-3xl mx-auto p-3 md:p-6 pb-28 space-y-4">
        {sessionId ? <SpeakerBoard sessionId={sessionId} /> : <TodayLessons />}
      </div>
    </Layout>
  );
}

function TodayLessons() {
  const { user, role } = useAuth();
  const lessons = useQuery({
    queryKey: ["speaker-today", user?.id, role],
    enabled: !!user,
    queryFn: async () => {
      const today = hanoiToday();
      let ids: string[] | null = null;
      if (role !== "admin") {
        const [{ data: t }, { data: ta }] = await Promise.all([
          db.from("teachers").select("id").eq("user_id", user!.id).maybeSingle(),
          db.from("teaching_assistants").select("id").eq("user_id", user!.id).maybeSingle(),
        ]);
        const set = new Set<string>();
        if (t?.id) {
          const { data } = await db.from("sessions").select("id").eq("date", today).eq("teacher_id", t.id);
          for (const s of data ?? []) set.add(s.id);
        }
        if (ta?.id) {
          const { data } = await db.from("session_participants").select("session_id").eq("teaching_assistant_id", ta.id);
          for (const s of data ?? []) set.add(s.session_id);
        }
        ids = [...set];
        if (!ids.length) return [];
      }
      let qy = db.from("sessions").select("id, start_time, end_time, status, classes(name)").eq("date", today).neq("status", "Canceled").order("start_time");
      if (ids) qy = qy.in("id", ids);
      const { data, error } = await qy;
      if (error) throw error;
      return (data ?? []) as { id: string; start_time: string; end_time: string; classes: { name: string } | null }[];
    },
  });
  if (lessons.isLoading) return <p className="text-muted-foreground">Loading today's lessons...</p>;
  if (!lessons.data?.length) return <p className="text-muted-foreground">No lesson of yours today.</p>;
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Pick today's lesson</h1>
      {lessons.data.map((l) => (
        <Link key={l.id} to={`/teacher/speakers/${l.id}`}
          className="block rounded-xl border border-border p-4 text-lg font-medium hover:bg-muted min-h-16">
          {l.classes?.name ?? "Class"} <span className="text-muted-foreground font-normal">{l.start_time.slice(0, 5)}-{l.end_time.slice(0, 5)}</span>
        </Link>
      ))}
    </div>
  );
}

function SpeakerBoard({ sessionId }: { sessionId: string }) {
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<SpeakerState>(NOBODY);

  const lesson = useQuery({
    queryKey: ["speaker-lesson", sessionId],
    queryFn: async () => {
      const { data } = await db.from("sessions").select("id, date, start_time, end_time, classes(name)").eq("id", sessionId).maybeSingle();
      return data as { date: string; start_time: string; end_time: string; classes: { name: string } | null } | null;
    },
  });
  const roster = useQuery({
    queryKey: ["speaker-roster", sessionId],
    queryFn: async () => {
      const { data, error } = await db.rpc("lesson_speaker_roster", { p_session: sessionId });
      if (error) throw new Error(error.message);
      return (data ?? []) as Kid[];
    },
    retry: false,
  });
  const recording = useQuery({
    queryKey: ["speaker-recording", sessionId],
    queryFn: async () => {
      const { data, error } = await db.rpc("lesson_speaker_recording", { p_session: sessionId });
      if (error) throw new Error(error.message);
      return ((data ?? [])[0] ?? null) as { status: string; started_at: string | null } | null;
    },
    refetchInterval: 30_000,
    retry: false,
  });
  const marks = useQuery({
    queryKey: ["speaker-marks", sessionId],
    queryFn: async () => {
      const { data, error } = await db.from("lesson_speaker_marks").select("id, kind, student_ids, at, offset_ms")
        .eq("session_id", sessionId).order("at", { ascending: false }).order("created_at", { ascending: false }).limit(8);
      if (error) throw new Error(error.message);
      return (data ?? []) as Mark[];
    },
    retry: false,
  });

  const latest = marks.data?.[0];
  useEffect(() => { if (!busy) setState(stateOf(latest)); }, [latest?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const nameOf = useMemo(() => new Map((roster.data ?? []).map((k) => [k.student_id, k.full_name])), [roster.data]);
  const describe = (m: { kind: SpeakerKind; student_ids: string[] | null }) =>
    m.kind === "teacher" ? "Teacher" : m.kind === "chorus" ? "Everyone (chorus)" : m.kind === "stop" ? "Nobody"
      : (m.student_ids ?? []).map((id) => nameOf.get(id) ?? "a child").join(" + ");

  const send = useCallback(async (next: SpeakerState) => {
    const before = state;
    setState(next);
    setBusy(true);
    const { error } = await db.from("lesson_speaker_marks").insert({
      // class, maker, time, recording and offset are the server's (trigger).
      session_id: sessionId, kind: next.kind, student_ids: next.studentIds, client_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) { setState(before); toast.error(`Not saved: ${error.message}`); return; }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(30);
    void marks.refetch();
  }, [state, sessionId, marks]);

  const undo = async () => {
    if (!latest) return;
    setBusy(true);
    const { error } = await db.from("lesson_speaker_marks").delete().eq("id", latest.id);
    setBusy(false);
    if (error) { toast.error(`Undo failed: ${error.message}`); return; }
    await marks.refetch();
  };

  if (roster.error) {
    const msg = (roster.error as Error).message;
    return <p className="text-destructive">{/does not exist|schema cache/.test(msg) ? "Who's speaking is not switched on yet (the database change is still to be applied)." : msg}</p>;
  }

  const live = recording.data?.status === "recording";
  const isOn = (k: SpeakerKind, id?: string) => state.kind === k && (k !== "student" || state.studentIds.includes(id!));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold break-words">{lesson.data?.classes?.name ?? "Lesson"} - who's speaking</h1>
          <p className="text-sm text-muted-foreground">{lesson.data ? `${lesson.data.date} ${lesson.data.start_time.slice(0, 5)}-${lesson.data.end_time.slice(0, 5)}` : ""}</p>
        </div>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium",
          live ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
          {live ? <CircleDot className="h-4 w-4 fill-destructive motion-safe:animate-pulse" aria-hidden /> : null}
          {live ? "Recording" : recording.isLoading ? "..." : "Not recording (marks still keep the time)"}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">Tap who starts speaking. Tap several children if they talk together; tap again to end one.</p>

      <div className="grid grid-cols-2 gap-3">
        <Tile on={isOn("teacher")} onClick={() => void send(tap(state, { kind: "teacher" }))} disabled={busy}>
          <GraduationCap className="h-8 w-8" aria-hidden /> Teacher
        </Tile>
        <Tile on={isOn("chorus")} onClick={() => void send(tap(state, { kind: "chorus" }))} disabled={busy}>
          <Users className="h-8 w-8" aria-hidden /> Everyone / chorus
        </Tile>
      </div>

      {roster.isLoading ? <p className="text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin" /> Loading the class...</p> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(roster.data ?? []).map((k) => (
            <Tile key={k.student_id} on={isOn("student", k.student_id)} disabled={busy}
              onClick={() => void send(tap(state, { kind: "student", id: k.student_id }))}>
              {k.avatar_url
                ? <img src={k.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
                : <span className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-xl font-bold">{k.full_name.slice(0, 1)}</span>}
              <span className="break-words text-center leading-tight">{k.full_name}</span>
            </Tile>
          ))}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hec-line bg-hec-surface">
        <div className="max-w-3xl mx-auto p-3 space-y-2">
          <div className="flex gap-2">
            <Button variant="destructive" className="flex-1 min-h-14 text-lg" disabled={busy || state.kind === "stop"} onClick={() => void send(NOBODY)}>
              <MicOff className="h-5 w-5 mr-2" aria-hidden /> Nobody / stop
            </Button>
            <Button variant="outline" className="min-h-14" disabled={busy || !latest} onClick={() => void undo()} aria-label="Undo the last mark">
              <Undo2 className="h-5 w-5 mr-1" aria-hidden /> Undo
            </Button>
          </div>
          <ul className="text-xs text-muted-foreground space-y-0.5 max-h-20 overflow-y-auto" aria-live="polite">
            {(marks.data ?? []).slice(0, 4).map((m) => (
              <li key={m.id} className="truncate">
                {hhmmss(m.at)}{m.offset_ms != null ? ` (rec ${offsetLabel(m.offset_ms)})` : ""} - {describe(m)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

function Tile({ on, disabled, onClick, children }: { on: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={on}
      className={cn("rounded-2xl border-2 p-3 min-h-28 flex flex-col items-center justify-center gap-2 text-base font-semibold transition-colors select-none touch-manipulation disabled:opacity-70",
        on ? "border-primary bg-primary text-primary-foreground shadow-lg" : "border-border bg-card hover:bg-muted")}>
      {children}
    </button>
  );
}
