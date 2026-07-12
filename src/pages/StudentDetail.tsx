import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentOverviewTab } from "@/components/student/StudentOverviewTab";
import { StudentTuitionTab } from "@/components/student/StudentTuitionTab";
import { StudentAttendanceTab } from "@/components/student/StudentAttendanceTab";
import { StudentDiscountsTab } from "@/components/admin/discount/StudentDiscountsTab";
import { StudentAccountInfo } from "@/components/student/StudentAccountInfo";
import { ClassLeaderboard } from "@/components/admin/ClassLeaderboard";
import { StudentEnrollmentsTab } from "@/components/student/StudentEnrollmentsTab";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAvatarUrl } from "@/lib/avatars";
import { Link } from "lucide-react";
import { useState } from "react";
import { StudentLinkDialog } from "@/components/admin/StudentLinkDialog";
import { StudentProfileEdit } from "@/components/student/StudentProfileEdit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExamReportsManager } from "@/components/exam-reports/ExamReportsManager";
import { AIReportDialog } from "@/components/reports/AIReportDialog";
import { CefrGrowthChart } from "@/components/charts/CefrGrowthChart";
import { useAuth } from "@/hooks/useAuth";

const StudentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const { data: student, isLoading } = useQuery({
    queryKey: ["student-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select(`
          *,
          family:families(id, name),
          enrollments(
            id,
            start_date,
            end_date,
            discount_type,
            discount_value,
            discount_cadence,
            class:classes(id, name, session_rate_vnd, default_teacher:teachers(id, full_name))
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      // If student has linked_user_id, get the user's email
      let linkedUserEmail = null;
      if (data?.linked_user_id) {
        const response = await supabase.functions.invoke('manage-admin-users', {
          body: { action: 'listUsers' }
        });
        
        if (!response.error && response.data?.users) {
          const linkedUser = response.data.users.find((u: any) => u.id === data.linked_user_id);
          if (linkedUser) {
            linkedUserEmail = linkedUser.email;
          }
        }
      }

      return { ...data, linkedUserEmail };
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  if (!student) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Student not found</h2>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 ring-2 ring-border">
              <AvatarImage src={getAvatarUrl(student.avatar_url) || undefined} alt={student.full_name} className="object-cover" />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-primary/10">
                {student.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">{student.full_name}</h1>
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">
                  Family: {student.family?.name || "No family"}
                </p>
                {student.linked_user_id && student.linkedUserEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Registered Email:</span>
                    <span className="font-medium text-foreground">{student.linkedUserEmail}</span>
                    <Badge variant="outline" className="text-xs">
                      Linked
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AIReportDialog
              studentId={student.id}
              studentName={student.full_name}
              classId={
                student.enrollments?.[0]?.class
                  ? (Array.isArray(student.enrollments[0].class)
                      ? student.enrollments[0].class[0]?.id
                      : student.enrollments[0].class.id)
                  : null
              }
            />
            <Button variant="outline" size="sm" onClick={() => setShowLinkDialog(true)}>
              <Link className="h-4 w-4 mr-2" />
              {student.linked_user_id ? 'Manage Link' : 'Connect to User'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
            <TabsTrigger value="tuition">Tuition</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="discounts">Discounts</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <StudentOverviewTab student={student} />

            {/* Language trajectory from transcripts, AI reports & exams */}
            <CefrGrowthChart studentId={student.id} />
            
            {/* Class Leaderboards - using Admin's ClassLeaderboard for unified rankings */}
            {student.enrollments && student.enrollments.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Class Rankings</h2>
                {student.enrollments.map((enrollment: any) => {
                  // Safely extract class data - handle both array and object responses
                  const classData = enrollment.class 
                    ? (Array.isArray(enrollment.class) ? enrollment.class[0] : enrollment.class)
                    : null;
                  
                  if (!classData?.id) {
                    console.warn('Enrollment missing class ID:', enrollment);
                    return null;
                  }
                  
                  return (
                    <div key={enrollment.id} className="space-y-2">
                      <h3 className="text-lg font-semibold">{classData.name || 'Class'}</h3>
                      <ClassLeaderboard classId={classData.id} showAddPoints={false} />
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="enrollments" className="space-y-6">
            <StudentEnrollmentsTab studentId={student.id} />
          </TabsContent>

          <TabsContent value="tuition" className="space-y-6">
            <StudentTuitionTab studentId={student.id} />
          </TabsContent>

          <TabsContent value="attendance" className="space-y-6">
            <StudentAttendanceTab studentId={student.id} />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ExamReportsManager
              fixedStudentId={student.id}
              isAdmin={true}
              currentUserId={user?.id}
              title="Exam reports"
            />
          </TabsContent>

          <TabsContent value="discounts" className="space-y-6">
            <StudentDiscountsTab studentId={student.id} />
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-xl font-semibold mb-4">Edit Profile</h3>
                <StudentProfileEdit studentId={student.id} />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4">Account Information</h3>
                <StudentAccountInfo studentId={student.id} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <StudentLinkDialog
          open={showLinkDialog}
          onOpenChange={setShowLinkDialog}
          studentId={student.id}
          studentName={student.full_name}
          currentUserId={student.linked_user_id}
          currentUserEmail={student.linkedUserEmail}
        />
      </div>
    </Layout>
  );
};

export default StudentDetail;