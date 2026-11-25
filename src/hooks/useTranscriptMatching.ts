import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  addDays, audioTwinIds, chosenMatch, confirmedMatch, matchPatch, suggestTranscriptSession,
  type MatchHow, type SessionRef, type TranscriptRow,
} from "@/lib/sessionClassReport";

/**
 * The matching screen's data: every older transcript the signed-in person can read, which
 * lesson each one is CONFIRMED to be (src/lib/sessionClassReport.ts), and for the rest the
 * lessons a person can pick from. A person's choice is saved in the transcript's own
 * `analysis.session_match`; `class_transcripts.session_id` is never written here, because
 * a stored session_id counts as strong "lesson was held" evidence for the pay and
 * cancel guards (20261112090000, 20261114090000) and the evidence is kept even if the
 * link is later removed.
 */
const db = supabase as any;

export interface MatchRow {
  t: TranscriptRow & { title: string | null; summary: string | null; source_format: string; created_at: string };
  className: string;
  /** How it is matched now ("stored", "chosen", "meeting", "date"), or null when nobody has matched it. */
  how: MatchHow | null;
  sessionId: string | null;
  suggestion: string | null;
  twinOfClass: string | null;
  stamp: boolean;
  /** This class's lessons within a few days before the filing date, and the day after. */
  candidates: SessionRef[];
  /** A person said it belongs to no lesson of this class. */
  none: boolean;
}
export interface MatchData { needs: MatchRow[]; decided: MatchRow[]; auto: MatchRow[]; unusable: number }

export function useTranscriptMatching() {
  return useQuery({
    queryKey: ["transcript-matching"],
    staleTime: 30_000,
    queryFn: async (): Promise<MatchData> => {
      const { data: rows, error } = await db.from("class_transcripts")
        .select("id, class_id, session_id, transcript_date, status, source_format, raw_text, title, summary, analysis, audio_duration_seconds, created_at, classes(name)")
        .order("transcript_date", { ascending: false });
      if (error) throw error;
      const all = (rows ?? []) as any[];
      const usable = all.filter((r) => (r.raw_text ?? "").trim().length >= 200);
      const classIds = [...new Set(usable.map((r) => r.class_id as string))];
      let sessions: any[] = [];
      if (classIds.length) {
        const dates = usable.map((r) => r.transcript_date as string).sort();
        const { data } = await db.from("sessions").select("id, class_id, date, start_time, status").in("class_id", classIds)
          .gte("date", addDays(dates[0], -6)).lte("date", addDays(dates[dates.length - 1], 2)).order("date");
        sessions = data ?? [];
      }
      const twins = audioTwinIds(usable);
      const nameOf = new Map(usable.map((r) => [r.class_id as string, (r.classes?.name as string) ?? ""]));
      const out: MatchData = { needs: [], decided: [], auto: [], unusable: all.length - usable.length };
      for (const r of usable) {
        const mine: SessionRef[] = sessions.filter((s) => s.class_id === r.class_id);
        const chosen = chosenMatch(r);
        const twin = twins.has(r.id) && !r.session_id && !chosen;
        const c = twin ? null : confirmedMatch(r, mine);
        const twinClass = twin
          ? [...new Set(usable.filter((o) => o.id !== r.id && o.class_id !== r.class_id
              && Number(o.audio_duration_seconds).toFixed(2) === Number(r.audio_duration_seconds).toFixed(2)).map((o) => nameOf.get(o.class_id) ?? ""))].join(", ")
          : null;
        const row: MatchRow = {
          t: r, className: nameOf.get(r.class_id) ?? "", how: c?.how ?? null, sessionId: c?.sessionId ?? null,
          suggestion: twin ? null : suggestTranscriptSession(r, mine),
          twinOfClass: twinClass, stamp: /Meeting\s+[A-Z][a-z]{2}\s/.test(String(r.raw_text).slice(0, 200)),
          candidates: mine.filter((s) => s.status !== "Canceled" && s.date >= addDays(r.transcript_date, -6) && s.date <= addDays(r.transcript_date, 1)),
          none: !!chosen && chosen.sessionId === null,
        };
        if (row.how === "stored" || row.how === "chosen" || row.none) out.decided.push(row);
        else if (row.how) out.auto.push(row);
        else out.needs.push(row);
      }
      return out;
    },
  });
}

/** Save a person's decision. `sessionId` null = "not a lesson of this class"; undefined = take the decision back. */
export function useDecideMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; analysis: unknown; sessionId: string | null | undefined; by: string }) => {
      const analysis = matchPatch(v.analysis, v.sessionId, v.by, new Date().toISOString());
      const { error } = await db.from("class_transcripts").update({ analysis }).eq("id", v.id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["transcript-matching"] });
      qc.invalidateQueries({ queryKey: ["session-class-report"] });
    },
  });
}
