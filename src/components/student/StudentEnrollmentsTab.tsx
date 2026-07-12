import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Calendar, Plus } from "lucide-react";
import { format } from "date-fns";
import { ModifyEnrollmentModal } from "@/components/admin/ModifyEnrollmentModal";
import { EnrollStudentDialog } from "@/components/admin/EnrollStudentDialog";
import { useAuth } from "@/hooks/useAuth";

interface StudentEnrollmentsTabProps {
  studentId: string;
}

export function StudentEnrollmentsTab({ studentId }: StudentEnrollmentsTabProps) {
  const { user, role } = useAuth();
  const [modifyingEnrollment, setModifyingEnrollment] = useState<any>(null);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);

  const { data: enrollments, refetch } = useQuery({
    queryKey: ["student-enrollments", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          *,
          students(id, full_name),
          classes(id, name)
        `)
        .eq("student_id", studentId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: pauseWindows } = useQuery({
    queryKey: ["pause-windows", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pause_windows")
        .select(`
          *,
          classes(name)
        `)
        .eq("student_id", studentId)
        .order("from_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const isAdmin = role === "admin";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Active Enrollments
            </span>
            {isAdmin && (
              <Button size="sm" onClick={() => setEnrollDialogOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Enroll in Class
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {enrollments?.filter(e => !e.end_date).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No active enrollments</p>
            ) : (
              enrollments?.filter(e => !e.end_date).map((enrollment) => (
                <div key={enrollment.id} className="flex items-center justify-between p-4 border rounded-lg gap-4">
                  <div className="space-y-1 flex-1">
                    <p className="font-medium">{enrollment.classes?.name || "Class"}</p>
                    <div className="flex gap-2 text-sm text-muted-foreground">
                      <span>Started: {format(new Date(enrollment.start_date), "MMM dd, yyyy")}</span>
                      {enrollment.discount_type && (
                        <Badge variant="secondary" className="text-xs">
                          {enrollment.discount_cadence} discount: {enrollment.discount_value}
                          {enrollment.discount_type === "percent" ? "%" : " VND"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setModifyingEnrollment(enrollment)}
                      className="shrink-0"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Modify
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {enrollments?.filter(e => e.end_date).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {enrollments?.filter(e => e.end_date).map((enrollment) => (
                <div key={enrollment.id} className="flex items-center justify-between p-4 border rounded-lg opacity-60">
                  <div className="space-y-1">
                    <p className="font-medium">{enrollment.classes?.name || "Class"}</p>
                    <div className="flex gap-2 text-sm text-muted-foreground">
                      <span>{format(new Date(enrollment.start_date), "MMM dd, yyyy")}</span>
                      <span>→</span>
                      <span>{format(new Date(enrollment.end_date), "MMM dd, yyyy")}</span>
                    </div>
                  </div>
                  <Badge variant="outline">Ended</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {pauseWindows && pauseWindows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pause History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pauseWindows.map((pause) => (
                <div key={pause.id} className="p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{pause.classes?.name || "Class"}</p>
                    <div className="flex gap-2 text-sm text-muted-foreground">
                      <span>Paused: {format(new Date(pause.from_date), "MMM dd, yyyy")}</span>
                      <span>→</span>
                      <span>{format(new Date(pause.to_date), "MMM dd, yyyy")}</span>
                    </div>
                    {pause.memo && (
                      <p className="text-sm text-muted-foreground mt-2">{pause.memo}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {modifyingEnrollment && (
        <ModifyEnrollmentModal
          open={!!modifyingEnrollment}
          onOpenChange={(open) => {
            if (!open) {
              setModifyingEnrollment(null);
              refetch();
            }
          }}
          enrollment={modifyingEnrollment}
        />
      )}

      {isAdmin && (
        <EnrollStudentDialog
          open={enrollDialogOpen}
          onOpenChange={setEnrollDialogOpen}
          studentId={studentId}
          existingClassIds={enrollments?.filter(e => !e.end_date).map(e => e.class_id) || []}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
