import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { TuitionCard } from "@/components/student/TuitionCard";
import { ScheduleCalendar } from "@/components/schedule/ScheduleCalendar";
import { AttendanceMarking } from "@/components/teacher/AttendanceMarking";
import { AssignmentUpload } from "@/components/teacher/AssignmentUpload";
import AssignmentsList from "@/components/student/AssignmentsList";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { PageHero } from "@/components/quest/PageHero";
import { SectionHeader } from "@/components/quest/SectionHeader";

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
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
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
            <div>
              <SectionHeader title="Teaching schedule" />
              <ScheduleCalendar role={role} />
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
