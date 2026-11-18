import Layout from "@/components/Layout";
import { StaffWorkGallery } from "@/components/gallery/StaffWorkGallery";
import { Images } from "lucide-react";

/**
 * "My Student Works": children now active in the teacher's classes, and only
 * work dated while this teacher was the class's default teacher or covered it.
 * The window is enforced by teacher_work_gallery, not here.
 */
export default function TeacherStudentWorks() {
  return (
    <Layout title="My Student Works">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-hec-md border border-hec-line bg-hec-sunken">
            <Images className="h-6 w-6 text-hec-ink-soft" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-hec-h1 font-medium text-hec-ink">My Student Works</h1>
            <p className="text-hec-small text-hec-ink-soft">
              Work from the children in your classes, from when you taught them. Approve what children want to share with their class.
            </p>
          </div>
        </div>
        <StaffWorkGallery mode="teacher" rpc="teacher_work_gallery" />
      </div>
    </Layout>
  );
}
