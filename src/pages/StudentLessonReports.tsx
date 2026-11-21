import { useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { LessonReports } from "@/components/student/LessonReports";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { ClipboardList } from "lucide-react";

/**
 * Daily class reports for one child. The child's own login and a shared
 * login use the selected child; a parent arriving from the family dashboard
 * names the child (?student=). The database decides whether the caller may
 * read that child (get_lesson_reports_for_student asks can_view_student).
 */
export default function StudentLessonReports() {
  const { studentId: selected } = useStudentProfile();
  const [params] = useSearchParams();
  const named = params.get("student");
  const studentId = named && /^[0-9a-fA-F-]{36}$/.test(named) ? named : selected;
  return (
    <Layout title="Class Reports">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-hec-md border border-hec-line bg-hec-sunken">
            <ClipboardList className="h-6 w-6 text-hec-ink-soft" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-hec-h1 font-medium text-hec-ink">Daily class reports</h1>
            <p lang="vi" className="text-hec-small text-hec-ink-soft">Báo cáo buổi học hằng ngày</p>
          </div>
        </div>
        <LessonReports studentId={studentId} />
      </div>
    </Layout>
  );
}
