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
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-md">
            <Video className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Videos</h1>
            <p className="text-sm text-muted-foreground">How your speaking is growing, and the videos your class shared.</p>
          </div>
        </div>
        {studentId && (
          <>
            <VideoProgressCard studentId={studentId} />
            {classes.map((c) => (
              <ClassVideoWall key={c.id} classId={c.id} className={c.name} studentId={studentId} />
            ))}
            <p className="text-xs text-muted-foreground text-center">
              Video homework is recorded on the Homework page. Your teacher checks every video before anyone sees it.
            </p>
          </>
        )}
      </div>
    </Layout>
  );
}
