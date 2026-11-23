import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2, ChevronLeft, Clock, Video } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchStudentHomework } from "@/lib/studentHomework";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import VideoHomeworkSubmission from "@/components/video-homework/VideoHomeworkSubmission";
import { videoDb } from "@/lib/video/recorder";
import { dayjs } from "@/lib/date";
import { useAuth } from "@/hooks/useAuth";
import { Arrive, ArriveItem } from "@/components/fx/Arrive";
import { pressable } from "@/components/fx/PaperPress";
import { BiText } from "@/components/student/walls/BiText";
import { Emoji } from "@/components/student/walls/Emoji";
import { WallHeader, WallNote } from "@/components/student/walls/WallHeader";
import { useAgeBand } from "@/hooks/useAgeBand";
import { wallsCopy } from "@/lib/copy/studentWalls";
import { cn } from "@/lib/utils";

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
  const { user } = useAuth();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: homeworks = [], isLoading } = useQuery({
    queryKey: ["student-assignments", studentId],
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
    // Shared cache key: a failed read throws rather than caching "no homework" for the other screens.
    queryFn: () => fetchStudentHomework(supabase, studentId!),
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
    <Layout title={wallsCopy["record.title"].en}>
      <Arrive scope="student-record" userId={user?.id} className="mx-auto max-w-2xl space-y-5">
        <ArriveItem index={0}>
          <WallHeader icon={Video} title={<BiText always entry={wallsCopy["record.title"]} />} sub={<BiText always entry={wallsCopy["record.foot"]} />} />
        </ArriveItem>

        <ArriveItem index={1}>
          {open ? (
            <div className="space-y-3">
              {tasks.length > 1 && (
                <Button variant="quiet" className="h-auto min-h-hec-target whitespace-normal" onClick={() => setOpenId(null)}><ChevronLeft className="mr-1 h-4 w-4 shrink-0" /> <BiText always entry={wallsCopy["record.all"]} /></Button>
              )}
              <h2 className="break-words font-display text-hec-h2 font-medium text-hec-ink">{open.title}</h2>
              {studentId && <VideoHomeworkSubmission homeworkId={open.id} studentId={studentId} kid />}
            </div>
          ) : isLoading || waiting ? (
            <p className="text-hec-body text-hec-ink-soft"><BiText always entry={wallsCopy["record.loading"]} />…</p>
          ) : tasks.length === 0 ? (
            <div className="rounded-hec-lg border border-dashed border-hec-line-strong bg-hec-surface p-10 text-center">
              <p className="break-words text-hec-h3 font-medium text-hec-ink"><Emoji>🎬 </Emoji><BiText always entry={wallsCopy["record.empty"]} /></p>
              <Button asChild variant="outline" className="mt-4 h-auto min-h-hec-target whitespace-normal"><Link to="/student/videos"><BiText always entry={wallsCopy["record.seeVideos"]} /></Link></Button>
            </div>
          ) : (
            <div className="space-y-5">
              {todo.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-hec-body font-medium text-hec-ink"><BiText always entry={wallsCopy["record.todo"]} /></h2>
                  {todo.map((t) => <TaskButton key={t.id} task={t} onOpen={() => setOpenId(t.id)} />)}
                </section>
              )}
              {rest.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-hec-body font-medium text-hec-ink-soft"><BiText always entry={wallsCopy["record.sent"]} /></h2>
                  {rest.map((t) => <TaskButton key={t.id} task={t} onOpen={() => setOpenId(t.id)} />)}
                </section>
              )}
            </div>
          )}
        </ArriveItem>
      </Arrive>
    </Layout>
  );
}

function TaskButton({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { band } = useAgeBand();
  const done = task.status === "sent" || task.status === "approved";
  // The early band never sees an overdue mark (brief G2); every other band sees it as before.
  const overdue = band !== "early" && !done && !!task.due && dayjs(task.due).isBefore(dayjs(), "day");
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex min-h-[5.5rem] w-full items-center gap-4 rounded-hec-lg border border-hec-line bg-hec-surface p-4 text-left shadow-hec-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring",
        pressable,
      )}
    >
      <span className="shrink-0 text-4xl empty:hidden"><Emoji>{task.status === "approved" ? "⭐" : done ? "📬" : task.status === "returned" ? "🔁" : "🎬"}</Emoji></span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-hec-h3 font-medium text-hec-ink">{task.title}</span>
        <span className="block break-words text-hec-small text-hec-ink-soft">
          {task.status === "approved" && <BiText always entry={wallsCopy["record.approved"]} />}
          {task.status === "sent" && <BiText always entry={wallsCopy["record.withTeacher"]} />}
          {task.status === "returned" && <BiText always entry={wallsCopy["record.again"]} />}
          {task.status === "todo" && (task.due ? `Due ${dayjs(task.due).format("ddd D MMM")}` : <BiText always entry={wallsCopy["record.ready"]} />)}
        </span>
      </span>
      {done ? <CheckCircle2 className="h-6 w-6 shrink-0 text-hec-leaf" /> : overdue ? <Clock className="h-6 w-6 shrink-0 text-hec-warn" /> : <Video className="h-6 w-6 shrink-0 text-hec-ink-soft" />}
    </button>
  );
}
