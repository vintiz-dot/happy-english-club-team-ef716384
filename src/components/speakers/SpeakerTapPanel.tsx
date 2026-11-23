import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleDot, GraduationCap, Loader2, MessagesSquare, MicOff, Undo2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  isConversation, NOBODY, offsetLabel, presentChildren, speakingLabel, stateOf, tap,
  type SpeakerKind, type SpeakerState,
} from "@/lib/speakerMarks";

/**
 * Who's speaking: tap a child when they start speaking, tap again when they
 * stop. Several children tapped at once is a conversation / dialogue. Each
 * tap is one row in lesson_speaker_marks (20261121140000): who speaks from
 * that moment on; the server stamps the time and the offset into the
 * recording. Staff of the lesson only.
 *
 * `embedded`: inside the class recorder while it records - compact tiles,
 * only the children marked present, no bar of its own (the recording bar is
 * at the bottom). Otherwise the full phone page for a TA (/teacher/speakers).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface Kid { student_id: string; full_name: string; avatar_url: string | null }
interface Mark { id: string; kind: SpeakerKind; student_ids: string[] | null; at: string; offset_ms: number | null }

const hhmmss = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(iso));

export function SpeakerTapPanel({ sessionId, embedded = false }: { sessionId: string; embedded?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<SpeakerState>(NOBODY);

  const lesson = useQuery({
    queryKey: ["speaker-lesson", sessionId],
    enabled: !embedded,
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
  // The register of this lesson: only the children marked present are shown.
  const register = useQuery({
    queryKey: ["speaker-register", sessionId],
    queryFn: async () => {
      const { data, error } = await db.from("attendance").select("student_id, status").eq("session_id", sessionId);
      if (error) return null;
      return (data ?? []) as { student_id: string; status: string }[];
    },
    refetchInterval: 60_000,
    retry: false,
  });
  const recording = useQuery({
    queryKey: ["speaker-recording", sessionId],
    enabled: !embedded,
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
  const name = useCallback((id: string) => nameOf.get(id) ?? "a child", [nameOf]);
  const kids = useMemo(() => {
    const here = presentChildren(roster.data ?? [], register.data);
    // A child already marked speaking stays on the board even if the register changed.
    const extra = (roster.data ?? []).filter((k) => state.studentIds.includes(k.student_id) && !here.includes(k));
    return [...here, ...extra];
  }, [roster.data, register.data, state.studentIds]);
  const describe = (m: { kind: SpeakerKind; student_ids: string[] | null }) =>
    m.kind === "teacher" ? "Teacher" : m.kind === "chorus" ? "Everyone (chorus)" : m.kind === "stop" ? "Nobody"
      : `${isConversation(m) ? "Conversation: " : ""}${(m.student_ids ?? []).map(name).join(" + ")}`;

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
  const talk = isConversation(state);

  const nowLine = (
    <p className={cn("rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2 min-h-10",
      talk ? "bg-primary/10 text-primary" : state.kind === "stop" ? "bg-muted text-muted-foreground" : "bg-muted text-foreground")} aria-live="polite">
      {talk ? <MessagesSquare className="h-4 w-4 shrink-0" aria-hidden /> : null}
      <span className="break-words min-w-0">{speakingLabel(state, name)}</span>
    </p>
  );

  const controls = (
    <div className="flex gap-2">
      {/* outline, not "destructive": that variant's glass layer painted it white on white. */}
      <Button variant="outline" className={cn("flex-1 border-2 border-destructive text-destructive font-semibold", embedded ? "min-h-11" : "min-h-14 text-lg")} disabled={busy || state.kind === "stop"} onClick={() => void send(NOBODY)}>
        <MicOff className="h-5 w-5 mr-2" aria-hidden /> Nobody / stop
      </Button>
      <Button variant="outline" className={embedded ? "min-h-11" : "min-h-14"} disabled={busy || !latest} onClick={() => void undo()} aria-label="Undo the last mark">
        <Undo2 className="h-5 w-5 mr-1" aria-hidden /> Undo
      </Button>
    </div>
  );

  const recent = (
    <ul className="text-xs text-muted-foreground space-y-0.5 max-h-20 overflow-y-auto">
      {(marks.data ?? []).slice(0, 4).map((m) => (
        <li key={m.id} className="truncate">
          {hhmmss(m.at)}{m.offset_ms != null ? ` (rec ${offsetLabel(m.offset_ms)})` : ""} - {describe(m)}
        </li>
      ))}
    </ul>
  );

  return (
    <div className={cn(embedded ? "space-y-3" : "space-y-4")} data-speaker-panel={embedded ? "embedded" : "page"}>
      {!embedded ? (
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
      ) : null}
      <p className="text-sm text-muted-foreground">Tap a child when they start speaking, tap again when they stop. Two or more at once is a conversation.</p>
      {nowLine}

      <div className={cn("grid gap-2", embedded ? "grid-cols-2" : "grid-cols-2 gap-3")}>
        <Tile small={embedded} on={isOn("teacher")} onClick={() => void send(tap(state, { kind: "teacher" }))} disabled={busy}>
          <GraduationCap className={embedded ? "h-5 w-5" : "h-8 w-8"} aria-hidden /> Teacher
        </Tile>
        <Tile small={embedded} on={isOn("chorus")} onClick={() => void send(tap(state, { kind: "chorus" }))} disabled={busy}>
          <Users className={embedded ? "h-5 w-5" : "h-8 w-8"} aria-hidden /> Everyone / chorus
        </Tile>
      </div>

      {roster.isLoading ? <p className="text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin" /> Loading the class...</p> : (
        kids.length ? (
          <div className={cn("grid gap-2", embedded ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 gap-3")}>
            {kids.map((k) => (
              <Tile key={k.student_id} small={embedded} on={isOn("student", k.student_id)} disabled={busy}
                onClick={() => void send(tap(state, { kind: "student", id: k.student_id }))}>
                {k.avatar_url
                  ? <img src={k.avatar_url} alt="" className={cn("rounded-full object-cover", embedded ? "h-9 w-9" : "h-14 w-14")} />
                  : <span className={cn("rounded-full bg-muted text-foreground flex items-center justify-center font-bold", embedded ? "h-9 w-9 text-base" : "h-14 w-14 text-xl")}>{k.full_name.slice(0, 1)}</span>}
                <span className="break-words text-center leading-tight">{k.full_name}</span>
              </Tile>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">No child is marked present at this lesson yet.</p>
      )}

      {embedded ? (
        <>{controls}{recent}</>
      ) : (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hec-line bg-hec-surface">
          <div className="max-w-3xl mx-auto p-3 space-y-2">{controls}{recent}</div>
        </div>
      )}
    </div>
  );
}

function Tile({ on, disabled, small, onClick, children }: { on: boolean; disabled?: boolean; small?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={on}
      className={cn("rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 font-semibold transition-colors select-none touch-manipulation disabled:opacity-70",
        small ? "p-2 min-h-20 text-sm" : "p-3 min-h-28 gap-2 text-base",
        on ? "border-primary bg-primary text-primary-foreground shadow-lg" : "border-border bg-card hover:bg-muted")}>
      {children}
    </button>
  );
}
