import { useQuery } from "@tanstack/react-query";
import { Video } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { VideoProgressCard } from "@/components/video-homework/VideoProgressCard";
import { ClassVideoWall } from "@/components/video-homework/ClassVideoWall";

/** "My Videos": the child's speaking journey and their classes' video walls. */
export default function StudentVideos() {
  const { studentId } = useStudentProfile();

  const { data: classes = [] } = useQuery({
    queryKey: ["student-video-classes", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("class_id, classes(id, name)")
        .eq("student_id", studentId!)
        .is("end_date", null);
      if (error) throw error;
      const seen = new Set<string>();
      return (data ?? [])
        .map((e: any) => e.classes)
        .filter((c: any) => c && !seen.has(c.id) && seen.add(c.id)) as { id: string; name: string }[];
    },
    enabled: !!studentId,
  });

  return (
    <Layout title="My Videos">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-hec-md border border-hec-line bg-hec-sunken">
            <Video className="h-6 w-6 text-hec-ink-soft" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-hec-h1 font-medium text-hec-ink">My Videos</h1>
            <p className="text-hec-small text-hec-ink-soft">How your speaking is growing, and the videos your class shared.</p>
          </div>
        </div>
        {studentId && (
          <>
            <VideoProgressCard studentId={studentId} />
            {classes.map((c) => (
              <ClassVideoWall key={c.id} classId={c.id} className={c.name} studentId={studentId} />
            ))}
            <p className="text-center text-hec-caption text-hec-ink-soft">
              Video homework is recorded on the Homework page. Your teacher checks every video before anyone sees it.
            </p>
          </>
        )}
      </div>
    </Layout>
  );
}
