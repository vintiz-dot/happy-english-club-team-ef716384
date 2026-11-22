import { useQuery } from "@tanstack/react-query";
import { Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * "Recorded in class": the lessons the Class recorder has finished, so the
 * teacher finds them next to the transcripts. Read through the teacher's own
 * session, so the recorder's own policy decides what is listed (an admin, the
 * class's standing teacher, the teacher of that lesson). It never touches the
 * audio and sends nothing anywhere: recorder audio is processed on the school
 * laptop (docs/LESSON_MONITOR_DESIGN.md, Option A), not by this screen.
 * Read untyped, as the recorder's own data layer does (types.ts lags migrations).
 */
interface Row { id: string; class_id: string; session_date: string; completed_at: string | null; audio_deleted_at: string | null; className: string }

export function RecordedInClass({ userId }: { userId: string }) {
  const q = useQuery<Row[]>({
    queryKey: ["recorded-in-class", userId],
    queryFn: async () => {
      const c: any = supabase;
      const { data, error } = await c.from("class_recordings")
        .select("id, class_id, session_date, completed_at, audio_deleted_at")
        .eq("status", "complete").eq("purpose", "lesson")
        .order("session_date", { ascending: false }).limit(10);
      if (error) throw new Error(String(error.message ?? error));
      const rows: any[] = data ?? [];
      const ids = [...new Set(rows.map((r) => r.class_id))];
      const { data: cls } = ids.length ? await c.from("classes").select("id, name").in("id", ids) : { data: [] };
      const name = new Map<string, string>((cls ?? []).map((x: any) => [x.id, x.name]));
      return rows.map((r) => ({ ...r, className: name.get(r.class_id) ?? "A class" }));
    },
  });
  const rows = q.data ?? [];
  if (q.isError || !rows.length) return null; // no recordings (or none readable): nothing to say

  return (
    <Card data-recorded-in-class="">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Mic className="h-4 w-4" aria-hidden /> Recorded in class</CardTitle>
        <p className="text-sm text-muted-foreground">
          Recordings from the Class recorder are transcribed on the school laptop overnight, not in this app, and are not sent to any
          online service. The transcript is not shown here yet. To get one now, upload the lesson audio file below: that is your own
          choice and sends that file for transcription.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="divide-y text-sm">
          {rows.map((r) => (
            <li key={r.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{r.className}</span>
              <span className="text-muted-foreground">{r.session_date}{r.audio_deleted_at ? " · audio deleted" : ""}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
