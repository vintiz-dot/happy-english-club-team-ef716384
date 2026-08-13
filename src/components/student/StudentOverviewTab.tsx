import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StudentEditDrawer } from "@/components/admin/StudentEditDrawer";
import { StudentClassLeaderboard } from "./StudentClassLeaderboard";
import { ProfilePictureUpload } from "./ProfilePictureUpload";
import { PointsBreakdownChart } from "./PointsBreakdownChart";
import { Users, BookOpen, User, Clock } from "lucide-react";

export function StudentOverviewTab({ student }: { student: any }) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Fetch family and siblings
  const { data: familyData } = useQuery({
    queryKey: ["student-family", student.id],
    queryFn: async () => {
      if (!student.family_id) return null;
      
      const { data, error } = await supabase
        .from("families")
        .select(`
          id,
          name,
          students(id, full_name)
        `)
        .eq("id", student.family_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!student.family_id,
  });

  // Fetch student's enrolled classes with metadata
  const { data: enrolledClasses } = useQuery({
    queryKey: ["student-enrolled-classes", student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("class_id, classes(id, name, curriculum, age_range, description, default_teacher_id, visibility_settings, schedule_template, default_session_length_minutes)")
        .eq("student_id", student.id)
        .is("end_date", null);

      if (error) throw error;

      const classes = data?.map(e => e.classes).filter(Boolean) || [];

      // Fetch teacher names for classes with default_teacher_id
      const teacherIds = [...new Set(classes.filter((c: any) => c.default_teacher_id).map((c: any) => c.default_teacher_id))];
      let teacherMap: Record<string, { name: string; bio: string | null }> = {};
      if (teacherIds.length > 0) {
        const { data: teachers } = await supabase
          .from("teachers")
          .select("id, full_name, bio")
          .in("id", teacherIds);
        teacherMap = Object.fromEntries((teachers || []).map(t => [t.id, { name: t.full_name, bio: t.bio }]));
      }

      return classes.map((c: any) => {
        const vis = c.visibility_settings || { curriculum: true, age_range: true, description: true, teacher_info: true };
        const teacher = c.default_teacher_id ? teacherMap[c.default_teacher_id] : null;
        return {
          ...c,
          teacherName: vis.teacher_info ? (teacher?.name || null) : null,
          teacherBio: vis.teacher_info ? (teacher?.bio || null) : null,
          showCurriculum: vis.curriculum,
          showAgeRange: vis.age_range,
          showDescription: vis.description,
        };
      });
    },
  });

  return (
    <>
      {/* Overall Points Summary - All Classes Combined */}
      {enrolledClasses && enrolledClasses.length > 1 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Overall Performance (All Classes)</h2>
          <PointsBreakdownChart studentId={student.id} />
        </div>
      )}

      {/* Per-Class Points and Leaderboards */}
      {enrolledClasses && enrolledClasses.length > 0 && (
        <div className="space-y-8">
          <h2 className="text-2xl font-bold">My Classes</h2>
          {enrolledClasses.map((cls: any) => (
            <div key={cls.id} className="space-y-4">
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="text-xl font-semibold">{cls.name}</h3>
                    {cls.teacherName && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                        <User className="h-3.5 w-3.5" />
                        {cls.teacherName}
                      </p>
                    )}
                  </div>

                  {/* Class metadata */}
                  {cls.showDescription && cls.description && (
                    <p className="text-sm text-muted-foreground">{cls.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    {cls.showCurriculum && cls.curriculum && (
                      <Badge variant="secondary" className="text-xs">
                        <BookOpen className="h-3 w-3 mr-1" />
                        {cls.curriculum}
                      </Badge>
                    )}
                    {cls.showAgeRange && cls.age_range && (
                      <Badge variant="secondary" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        Ages {cls.age_range}
                      </Badge>
                    )}
                    {cls.default_session_length_minutes && (
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {cls.default_session_length_minutes} min
                      </Badge>
                    )}
                  </div>

                  {cls.teacherBio && (
                    <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
                      {cls.teacherBio}
                    </p>
                  )}
                </CardContent>
              </Card>
              
              {/* Points breakdown for this specific class */}
              <PointsBreakdownChart studentId={student.id} classId={cls.id} />
              
              {/* Leaderboard for this class */}
              <StudentClassLeaderboard classId={cls.id} className={cls.name} currentStudentId={student.id} />
            </div>
          ))}
        </div>
      )}

      {/* Family & Siblings Card */}
      {(
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Family Information
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
              {familyData ? "Change family" : "Add to family"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Family</p>
              <p className="font-medium">{familyData?.name || "Not in a family yet"}</p>
            </div>
            
            
            {familyData?.students && familyData.students.length > 1 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Siblings</p>
                <div className="flex flex-wrap gap-2">
                  {familyData.students
                    .filter((s: any) => s.id !== student.id)
                    .map((sibling: any) => (
                      <Badge key={sibling.id} variant="outline">
                        {sibling.full_name}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Profile</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <ProfilePictureUpload 
            studentId={student.id}
            currentAvatarUrl={student.avatar_url}
            studentName={student.full_name}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{student.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{student.email || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{student.phone || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="font-medium">
                {student.date_of_birth ? format(new Date(student.date_of_birth), "MMM d, yyyy") : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={student.is_active ? "default" : "secondary"}>
                {student.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
          {student.notes && (
            <div>
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="text-sm">{student.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enrollments</CardTitle>
        </CardHeader>
        <CardContent>
          {student.enrollments && student.enrollments.length > 0 ? (
            <div className="space-y-3">
              {student.enrollments.map((enrollment: any) => (
                <div key={enrollment.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{enrollment.class?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Teacher: {enrollment.class?.default_teacher?.full_name || "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(enrollment.start_date), "MMM d, yyyy")} 
                      {enrollment.end_date && ` - ${format(new Date(enrollment.end_date), "MMM d, yyyy")}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {enrollment.class?.session_rate_vnd?.toLocaleString("vi-VN")} ₫
                    </p>
                    {enrollment.discount_type && (
                      <Badge variant="secondary" className="text-xs">
                        {enrollment.discount_type === "percent" ? `${enrollment.discount_value}%` : `${enrollment.discount_value?.toLocaleString("vi-VN")} ₫`} 
                        {" "}off - {enrollment.discount_cadence}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active enrollments</p>
          )}
        </CardContent>
      </Card>

      <StudentEditDrawer
        student={student}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
    </>
  );
}