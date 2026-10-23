import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { TuitionCard } from "@/components/student/TuitionCard";
import { ScheduleCalendar } from "@/components/schedule/ScheduleCalendar";
import GlobalCalendar from "@/components/schedule/GlobalCalendar";
import { AttendanceMarking } from "@/components/teacher/AttendanceMarking";
import { AssignmentUpload } from "@/components/teacher/AssignmentUpload";
import AssignmentsList from "@/components/student/AssignmentsList";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { PageHero } from "@/components/quest/PageHero";
import { SectionHeader } from "@/components/quest/SectionHeader";
import { PageLoading } from "@/components/ui/loading";

const Index = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { studentId } = useStudentProfile();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageLoading />
      </div>
    );
  }

  if (role === "student") {
    return <Navigate to="/dashboard" replace />;
  }

  if (role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <PageHero
          eyebrow={role === "teacher" ? "Teacher hub" : "Family hub"}
          title={role === "teacher" ? "Welcome back, teacher" : "Hello, family"}
          subtitle={
            role === "teacher"
              ? "Mark attendance, post assignments, and check today's schedule."
              : "Your schedule, assignments, and tuition — all in one place."
          }
          variant={role === "teacher" ? "glacier" : "aurora"}
        />

        {role === "teacher" && (
          <div className="space-y-6">
            <div className="grid gap-5 lg:grid-cols-2">
              <AttendanceMarking />
              <AssignmentUpload />
            </div>
            {/* The same calendar the Schedule page and the teacher
                dashboard use - week, day and list views, per-class
                colours, the duration-mismatch flag, and the attendance
                drawer on a click.

                Assistants hold the teacher role and land here too, and
                GlobalCalendar resolves teacher-or-assistant itself: a TA
                gets the lessons they are rostered on, through
                session_participants. The month grid this replaces also
                had that branch, but it FAILED OPEN - a teacher-role user
                with neither a teachers nor a teaching_assistants row
                dropped through both lookups and the query ran unfiltered,
                returning every session in the school. GlobalCalendar
                returns nothing instead, which is the right way round. */}
            <div>
              <SectionHeader title="Teaching schedule" />
              <GlobalCalendar role="teacher" />
            </div>
          </div>
        )}

        {role === "family" && studentId && (
          <div className="space-y-6">
            <TuitionCard studentId={studentId} />
            <div>
              <SectionHeader title="Schedule" />
              <ScheduleCalendar role={role} />
            </div>
            <div>
              <SectionHeader title="Assignments" />
              <AssignmentsList studentId={studentId} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Index;
