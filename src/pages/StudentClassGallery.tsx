import Layout from "@/components/Layout";
import { ClassWorkGallery } from "@/components/student/ClassWorkGallery";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { Images } from "lucide-react";

/** The class gallery: work classmates chose to share and a teacher approved. */
export default function StudentClassGallery() {
  const { studentId } = useStudentProfile();
  return (
    <Layout title="Class Gallery">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-hec-md border border-hec-line bg-hec-sunken">
            <Images className="h-6 w-6 text-hec-ink-soft" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-hec-h1 font-medium text-hec-ink">Class Gallery</h1>
            <p className="text-hec-small text-hec-ink-soft">Work from your class that classmates chose to share.</p>
          </div>
        </div>
        <ClassWorkGallery studentId={studentId} />
      </div>
    </Layout>
  );
}
