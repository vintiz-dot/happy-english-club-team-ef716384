import { useQuery } from "@tanstack/react-query";
import { Video } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { useAuth } from "@/hooks/useAuth";
import { VideoProgressCard } from "@/components/video-homework/VideoProgressCard";
import { ClassVideoWall } from "@/components/video-homework/ClassVideoWall";
import { Arrive, ArriveItem } from "@/components/fx/Arrive";
import { WallHeader } from "@/components/student/walls/WallHeader";
import { BiText } from "@/components/student/walls/BiText";
import { useWallBand } from "@/components/student/walls/useWallBand";
import { wallsCopy } from "@/lib/copy/studentWalls";

/** "My Videos": the child's speaking journey and their classes' video walls. */
export default function StudentVideos() {
  const { studentId } = useStudentProfile();
  const { user } = useAuth();
  const { kid } = useWallBand();
  const title = kid ? wallsCopy["videos.title.kid"] : wallsCopy["videos.title"];
  const sub = kid ? wallsCopy["videos.sub.kid"] : wallsCopy["videos.sub"];

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
    <Layout title={title.en}>
      <Arrive scope="student-videos" userId={user?.id} className="mx-auto max-w-5xl space-y-6">
        <ArriveItem index={0}>
          <WallHeader icon={Video} title={<BiText entry={title} />} sub={<BiText entry={sub} />} />
        </ArriveItem>
        {studentId && (
          <>
            <ArriveItem index={1}>
              <VideoProgressCard studentId={studentId} />
            </ArriveItem>
            {classes.map((c, i) => (
              <ArriveItem key={c.id} index={2 + i}>
                <ClassVideoWall classId={c.id} className={c.name} studentId={studentId} />
              </ArriveItem>
            ))}
            <p className="break-words text-center text-hec-caption text-hec-ink-soft">
              <BiText entry={wallsCopy["videos.foot"]} viClassName="text-hec-caption" />
            </p>
          </>
        )}
      </Arrive>
    </Layout>
  );
}
