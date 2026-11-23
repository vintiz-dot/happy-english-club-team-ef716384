import { useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { LessonReports } from "@/components/student/LessonReports";
import { BiText } from "@/components/student/lessons/BiText";
import { Rise } from "@/components/student/lessons/Rise";
import { Arrive } from "@/components/fx/Arrive";
import { useAuth } from "@/hooks/useAuth";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { ClipboardList } from "lucide-react";

/**
 * Daily class reports for one child. The child's own login and a shared
 * login use the selected child; a parent arriving from the family dashboard
 * names the child (?student=). The database decides whether the caller may
 * read that child (get_lesson_reports_for_student asks can_view_student).
 */
export default function StudentLessonReports() {
  const { user } = useAuth();
  const { studentId: selected } = useStudentProfile();
  const [params] = useSearchParams();
  const named = params.get("student");
  const studentId = named && /^[0-9a-fA-F-]{36}$/.test(named) ? named : selected;
  return (
    <Layout title="Class Reports">
      <Arrive scope="student-lesson-reports" userId={user?.id} className="mx-auto max-w-3xl space-y-5">
        <Rise index={0}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-hec-md border border-hec-line bg-hec-sunken">
              <ClipboardList className="h-6 w-6 text-hec-ink-soft" aria-hidden />
            </div>
            <h1 className="min-w-0 font-display text-hec-h1 font-medium text-hec-ink [[data-hec-scale=young]_&]:font-bold">
              <BiText k="reports.title" always />
            </h1>
          </div>
        </Rise>
        <LessonReports studentId={studentId} />
      </Arrive>
    </Layout>
  );
}
