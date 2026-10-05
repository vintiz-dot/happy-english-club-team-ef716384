import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Pencil, Check, X, Settings, ChevronRight } from "lucide-react";
import { ModifyEnrollmentModal } from "../ModifyEnrollmentModal";

/**
 * The student's name, linked to their profile.
 *
 * The roster is the natural place to say "open that child" from, and these
 * names were previously plain text — the only way through was to leave the
 * class, go to Students, and search. Falls back to plain text if the embedded
 * student row is missing, so a broken join cannot produce a link to /students/.
 */
const StudentLink = ({ enrollment }: any) => {
  const studentId = enrollment.students?.id ?? enrollment.student_id;
  const name = enrollment.students?.full_name;

  if (!studentId || !name) {
    return <span className="text-muted-foreground">{name || "Unknown student"}</span>;
  }

  return (
    <Link
      to={`/students/${studentId}`}
      className="group inline-flex items-center gap-1 font-medium hover:text-primary hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      title={`Open ${name}'s profile`}
    >
      {name}
      <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-70" />
    </Link>
  );
};

const EnrollmentRow = ({ enrollment, onUpdate, onModify }: any) => {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(enrollment.start_date);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("enrollments")
        .update({ start_date: date })
        .eq("id", enrollment.id);

      if (error) throw error;

      toast.success("Enrollment date updated");
      setEditing(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to update date");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between p-2 border rounded hover:bg-muted/40 transition-colors">
        <StudentLink enrollment={enrollment} />
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Since {format(new Date(enrollment.start_date), "MMM dd, yyyy")}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onModify(enrollment)}
            title="Modify enrollment"
          >
            <Settings className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setEditing(true)}
            title="Edit start date"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-2 border rounded bg-muted/50">
      <StudentLink enrollment={enrollment} />
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-8 w-36"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleSave}
          disabled={saving}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            setDate(enrollment.start_date);
            setEditing(false);
          }}
          disabled={saving}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

const ClassEnrollments = ({ classId }: { classId: string }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [enrolling, setEnrolling] = useState(false);
  const [modifyingEnrollment, setModifyingEnrollment] = useState<any>(null);
  const queryClient = useQueryClient();

  // Real-time subscription for enrollment changes
  useEffect(() => {
    const channel = supabase
      .channel(`class-enrollments-admin-${classId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'enrollments',
          filter: `class_id=eq.${classId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["class-enrollments", classId] });
          queryClient.invalidateQueries({ queryKey: ["available-students", classId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId, queryClient]);

  const { data: enrollments, refetch: refetchEnrollments } = useQuery({
    queryKey: ["class-enrollments", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          *,
          students(id, full_name),
          classes(name)
        `)
        .eq("class_id", classId)
        .is("end_date", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: availableStudents } = useQuery({
    queryKey: ["available-students", classId],
    queryFn: async () => {
      // Get all active students
      const { data: allStudents, error: studentsError } = await supabase
        .from("students")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");

      if (studentsError) throw studentsError;

      // Get currently enrolled student IDs
      const enrolledIds = enrollments?.map((e) => e.student_id) || [];

      // Filter out enrolled students
      return allStudents?.filter((s) => !enrolledIds.includes(s.id)) || [];
    },
    enabled: !!enrollments,
  });

  const handleBulkEnroll = async () => {
    if (selected.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    setEnrolling(true);
    try {
      const enrollmentData = selected.map((studentId) => ({
        class_id: classId,
        student_id: studentId,
        start_date: startDate,
      }));

      const { error } = await supabase.from("enrollments").insert(enrollmentData);

      if (error) throw error;

      toast.success(`Successfully enrolled ${selected.length} student(s)`);
      setSelected([]);
      refetchEnrollments();
    } catch (error: any) {
      console.error("Error enrolling students:", error);
      toast.error(error.message || "Failed to enroll students");
    } finally {
      setEnrolling(false);
    }
  };

  const handleToggle = (studentId: string) => {
    setSelected((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Enrollments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {enrollments?.map((enrollment) => (
              <EnrollmentRow
                key={enrollment.id}
                enrollment={enrollment}
                onUpdate={refetchEnrollments}
                onModify={setModifyingEnrollment}
              />
            ))}
            {!enrollments?.length && (
              <p className="text-muted-foreground text-center py-4">No enrollments yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ... keep existing code (bulk enroll card) */}

      {modifyingEnrollment && (
        <ModifyEnrollmentModal
          open={!!modifyingEnrollment}
          onOpenChange={(open) => !open && setModifyingEnrollment(null)}
          enrollment={modifyingEnrollment}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bulk Enroll Students</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Select Students</Label>
            <div className="border rounded p-4 max-h-64 overflow-auto space-y-2">
              {availableStudents?.map((student) => (
                <div key={student.id} className="flex items-center gap-2">
                  <Checkbox
                    id={student.id}
                    checked={selected.includes(student.id)}
                    onCheckedChange={() => handleToggle(student.id)}
                  />
                  <label htmlFor={student.id} className="cursor-pointer flex-1">
                    {student.full_name}
                  </label>
                </div>
              ))}
              {!availableStudents?.length && (
                <p className="text-muted-foreground text-center">
                  All active students are already enrolled
                </p>
              )}
            </div>
          </div>

          <Button
            onClick={handleBulkEnroll}
            disabled={enrolling || selected.length === 0}
            className="w-full"
          >
            {enrolling ? "Enrolling..." : `Enroll ${selected.length} Student(s)`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassEnrollments;
