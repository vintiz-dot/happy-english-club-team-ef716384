import Layout from "@/components/Layout";
import { StaffWorkGallery } from "@/components/gallery/StaffWorkGallery";
import { Images } from "lucide-react";

/** Admin only (route guard + admin_work_gallery): every child's work, every status. */
export default function AdminStudentWork() {
  return (
    <Layout title="Student Work">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-hec-md border border-hec-line bg-hec-sunken">
            <Images className="h-6 w-6 text-hec-ink-soft" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-hec-h1 font-medium text-hec-ink">Student Work</h1>
            <p className="text-hec-small text-hec-ink-soft">
              Classwork, homework files and videos from the whole school. Group by class, family or student.
            </p>
          </div>
        </div>
        <StaffWorkGallery mode="admin" rpc="admin_work_gallery" />
      </div>
    </Layout>
  );
}
