import Layout from "@/components/Layout";
import { ClassWorkGallery } from "@/components/student/ClassWorkGallery";
import { Arrive, ArriveItem } from "@/components/fx/Arrive";
import { WallHeader } from "@/components/student/walls/WallHeader";
import { BiText } from "@/components/student/walls/BiText";
import { useWallBand } from "@/components/student/walls/useWallBand";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { useAuth } from "@/hooks/useAuth";
import { wallsCopy } from "@/lib/copy/studentWalls";
import { Images } from "lucide-react";

/** The class gallery: work classmates chose to share and a teacher approved. */
export default function StudentClassGallery() {
  const { studentId } = useStudentProfile();
  const { user } = useAuth();
  const { kid } = useWallBand();
  const title = kid ? wallsCopy["classWall.title.kid"] : wallsCopy["classWall.title"];
  const sub = kid ? wallsCopy["classWall.sub.kid"] : wallsCopy["classWall.sub"];
  return (
    <Layout title={title.en}>
      <Arrive scope="student-class-gallery" userId={user?.id} className="mx-auto max-w-5xl space-y-6">
        <ArriveItem index={0}>
          <WallHeader icon={Images} title={<BiText entry={title} />} sub={<BiText entry={sub} />} />
        </ArriveItem>
        <ClassWorkGallery studentId={studentId} />
      </Arrive>
    </Layout>
  );
}
