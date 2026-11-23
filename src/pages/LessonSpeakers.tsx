import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { SpeakerTapPanel } from "@/components/speakers/SpeakerTapPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * /teacher/speakers/:sessionId - "Who's speaking". A TA (or the teacher) taps
 * who is talking during a recorded lesson; each tap is a row in
 * lesson_speaker_marks (20261121140000) stamped by the server with the time and
 * the offset into the lesson's recording. Staff of the lesson only.
 * /teacher/speakers lists today's lessons to pick from.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const hanoiToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

export default function LessonSpeakers() {
  const { sessionId } = useParams();
  return (
    <Layout title="Who's speaking">
      <div className="max-w-3xl mx-auto p-3 md:p-6 pb-28 space-y-4">
        {sessionId ? <SpeakerTapPanel sessionId={sessionId} /> : <TodayLessons />}
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
