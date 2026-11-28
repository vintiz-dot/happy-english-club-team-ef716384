import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { prefill, seatsAt, confirmRows, type Mic, type Seating, type SeatRow } from "@/lib/micMap";
import { presentChildren } from "@/lib/speakerMarks";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface MicKid { student_id: string; full_name: string; avatar_url: string | null }

/**
 * The mic map of one lesson (lesson_mic_seats, 20261128090000). Every read is
 * optional: before the migration is applied, or on a refused read, the board
 * simply has nothing to show and recording is never affected.
 */
export function useMicMap(sessionId: string | undefined, classId: string | undefined) {
  const qc = useQueryClient();
  const key = ["mic-map", sessionId];

  const roster = useQuery({
    queryKey: ["speaker-roster", sessionId], enabled: !!sessionId, retry: false,
    queryFn: async () => {
      const { data, error } = await db.rpc("lesson_speaker_roster", { p_session: sessionId });
      if (error) throw new Error(error.message);
      return (data ?? []) as MicKid[];
    },
  });
  const register = useQuery({
    queryKey: ["speaker-register", sessionId], enabled: !!sessionId, retry: false, refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await db.from("attendance").select("student_id, status").eq("session_id", sessionId);
      if (error) return null;
      return (data ?? []) as { student_id: string; status: string }[];
    },
  });
  const seats = useQuery({
    queryKey: key, enabled: !!sessionId, retry: false,
    queryFn: async () => {
      const { data, error } = await db.from("lesson_mic_seats").select("id, student_id, mic, at, set_by, created_at")
        .eq("session_id", sessionId).order("at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as (SeatRow & { id: string })[];
    },
  });
  const previous = useQuery({
    queryKey: ["mic-map-previous", sessionId, classId], enabled: !!sessionId && !!classId, retry: false, staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await db.from("lesson_mic_seats").select("session_id, student_id, mic, at")
        .eq("class_id", classId).neq("session_id", sessionId).order("at", { ascending: false }).limit(80);
      if (error || !data?.length) return [] as SeatRow[];
      return (data as (SeatRow & { session_id: string })[]).filter((r) => r.session_id === data[0].session_id);
    },
  });

  const kids = useMemo(() => presentChildren(roster.data ?? [], register.data) as MicKid[], [roster.data, register.data]);
  const current: Seating = useMemo(() => seatsAt(seats.data), [seats.data]);
  const suggested: Seating = useMemo(() => prefill(kids.map((k) => k.student_id), previous.data), [kids, previous.data]);
  const confirmed = (seats.data?.length ?? 0) > 0;

  const save = useCallback(async (rows: { student_id: string; mic: Mic }[]) => {
    if (!sessionId || !rows.length) return null;
    const { error } = await db.from("lesson_mic_seats").insert(rows.map((r) => ({ session_id: sessionId, ...r })));
    if (!error) await qc.invalidateQueries({ queryKey: key });
    return error ? (error.message as string) : null;
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Confirm the whole board: one row per seated child, at now. */
  const confirm = useCallback((seating: Seating) => save(confirmRows(sessionId ?? "", seating).map(({ student_id, mic }) => ({ student_id, mic }))), [save, sessionId]);
  /** One child moved to a mic. */
  const moveTo = useCallback((studentId: string, mic: Mic) => save([{ student_id: studentId, mic }]), [save]);

  return { kids, current, suggested, confirmed, loading: roster.isLoading || seats.isLoading, unavailable: !!seats.error || !!roster.error, confirm, moveTo };
}
