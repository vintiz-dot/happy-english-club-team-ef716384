import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2, ChevronLeft, Clock, Video } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import VideoHomeworkSubmission from "@/components/video-homework/VideoHomeworkSubmission";
import { videoDb } from "@/lib/video/recorder";
import { dayjs } from "@/lib/date";

interface Task {
  id: string;
  title: string;
  due: string | null;
  status: "todo" | "sent" | "approved" | "returned";
}

/**
 * "Record my video": one place a child (or the parent beside them) can always
 * find their video homework, and the same easy recorder from there. No
 * hunting through the homework list, and no choosing between pages.
 */
export default function StudentRecord() {
  const { studentId } = useStudentProfile();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: homeworks = [], isLoading } = useQuery({
    queryKey: ["student-assignments", studentId],
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_student_homeworks", { p_student_id: studentId! });
      if (error) return [];
      const result = data as any;
      const subs: any[] = result?.submissions || [];
      const byHw = new Map(subs.map((s) => [s.homework_id, s]));
      return ((result?.homeworks || []) as any[]).map((hw) => ({ ...hw, submission: byHw.get(hw.id) || null }));
    },
  });

  // Recent first; only as many as a child could plausibly have open at once.
  const recent = useMemo(
    () => [...homeworks].sort((a, b) => String(b.due_date ?? "").localeCompare(String(a.due_date ?? ""))).slice(0, 20),
    [homeworks],
  );

  // Which of them are video homework: the same call the homework page makes, so it is shared.
  const states = useQueries({
    queries: recent.map((hw) => ({
      queryKey: ["video-homework", hw.id, studentId],
      enabled: !!studentId,
      retry: false,
      queryFn: async () => {
        const { data, error } = await videoDb.rpc("get_video_homework_for_student", { p_homework: hw.id, p_student: studentId });
        if (error) throw error;
        return data as { submission_type: string; title: string; submission: { status: string } | null } | null;
      },
    })),
  });

  const tasks: Task[] = recent.flatMap((hw, i) => {
    const s = states[i]?.data;
    if (!s || s.submission_type !== "video") return [];
    const st = s.submission?.status;
    const status: Task["status"] = !st ? "todo" : st === "approved" ? "approved" : st === "returned" ? "returned" : "sent";
    return [{ id: hw.id, title: hw.title || s.title, due: hw.due_date ?? null, status }];
  });
  const todo = tasks.filter((t) => t.status === "todo" || t.status === "returned");
  const rest = tasks.filter((t) => t.status === "sent" || t.status === "approved");
  const waiting = states.some((q) => q.isLoading);

  // One thing to record: go straight to it.
  useEffect(() => {
    if (!openId && !waiting && todo.length === 1 && rest.length === 0) setOpenId(todo[0].id);
  }, [waiting, todo.length, rest.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = tasks.find((t) => t.id === openId) ?? null;

  return (
    <Layout title="Record my video">
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-md text-3xl">🎥</div>
          <div>
            <h1 className="text-2xl font-bold">Record my video</h1>
            <p className="text-sm text-muted-foreground">Quay video của em</p>
          </div>
        </div>

        {open ? (
          <div className="space-y-3">
            {tasks.length > 1 && (
              <Button variant="ghost" onClick={() => setOpenId(null)}><ChevronLeft className="h-4 w-4 mr-1" /> All my videos</Button>
            )}
            <h2 className="text-xl font-bold">{open.title}</h2>
            {studentId && <VideoHomeworkSubmission homeworkId={open.id} studentId={studentId} kid />}
          </div>
        ) : isLoading || waiting ? (
          <p className="text-muted-foreground">Looking for your videos…</p>
        ) : tasks.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed p-10 text-center">
            <div className="text-5xl mb-2">🎉</div>
            <p className="text-lg font-semibold">No videos to record right now!</p>
            <p className="text-sm text-muted-foreground">Chưa có video nào cần quay.</p>
            <Button asChild variant="outline" className="mt-4"><Link to="/student/videos">See my videos</Link></Button>
          </div>
        ) : (
          <>
            {todo.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-semibold">To record · Cần quay</h2>
                {todo.map((t) => <TaskButton key={t.id} task={t} onOpen={() => setOpenId(t.id)} />)}
              </section>
            )}
            {rest.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-semibold text-muted-foreground">Sent · Đã gửi</h2>
                {rest.map((t) => <TaskButton key={t.id} task={t} onOpen={() => setOpenId(t.id)} />)}
              </section>
            )}
          </>
        )}
        <p className="text-xs text-center text-muted-foreground">
          Your teacher watches every video first. Cô giáo sẽ xem video trước khi ai khác nhìn thấy.
        </p>
      </div>
    </Layout>
  );
}

function TaskButton({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const done = task.status === "sent" || task.status === "approved";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-3xl border-2 p-4 hover:bg-accent hover:border-primary transition flex items-center gap-4 min-h-[5.5rem]"
    >
      <span className="text-4xl">{task.status === "approved" ? "⭐" : done ? "📬" : task.status === "returned" ? "🔁" : "🎬"}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-lg font-bold truncate">{task.title}</span>
        <span className="block text-sm text-muted-foreground">
          {task.status === "approved" && "Your teacher watched it · Cô đã xem"}
          {task.status === "sent" && "With your teacher · Đã gửi cô giáo"}
          {task.status === "returned" && "Please record again · Hãy quay lại nhé"}
          {task.status === "todo" && (task.due ? `Due ${dayjs(task.due).format("ddd D MMM")}` : "Ready when you are")}
        </span>
      </span>
      {done ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : task.due && dayjs(task.due).isBefore(dayjs(), "day") ? <Clock className="h-6 w-6 text-amber-600" /> : <Video className="h-6 w-6 text-primary" />}
    </button>
  );
}
