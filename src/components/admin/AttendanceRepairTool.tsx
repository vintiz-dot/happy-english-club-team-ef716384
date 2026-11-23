import { useState, useEffect } from "react";
import { proofRefusalFromBody } from "@/lib/attendanceProof";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wrench, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { moneyErrorText, needsMoneyDialog } from "@/lib/moneyGuard";
import { useMoneyChange } from "@/components/admin/money-guard/useMoneyChange";
import { MoneyGuardDialog } from "@/components/admin/money-guard/MoneyGuardDialog";

interface Student {
  id: string;
  full_name: string;
}

interface Enrollment {
  class_id: string;
  classes: {
    name: string;
  };
}

export function AttendanceRepairTool() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [defaultStatus, setDefaultStatus] = useState<"Present" | "Absent" | "Excused">("Present");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      loadEnrollments();
    } else {
      setEnrollments([]);
      setSelectedClass("");
    }
  }, [selectedStudent]);

  const loadStudents = async () => {
    const { data } = await supabase
      .from("students")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name");
    
    if (data) setStudents(data);
  };

  const loadEnrollments = async () => {
    const { data } = await supabase
      .from("enrollments")
      .select("class_id, classes(name)")
      .eq("student_id", selectedStudent);
    
    if (data) setEnrollments(data as any);
  };

  // D4 step 1b (G-12): "Preview" only reads (it used to write the rows
  // straight away). "Repair Attendance" writes through the checked path on
  // the admin's own JWT; when old billed months are reached the server
  // answers 409 with its preview and the money guard dialog asks for a reason.
  const guard = useMoneyChange((result) => {
    toast.success(`Repaired ${result?.written ?? 0} attendance records`);
    setPreview(null);
  });

  const readBody = async (error: any): Promise<any> => {
    try {
      const ctx = error?.context;
      const src = typeof ctx?.clone === "function" ? ctx.clone() : ctx;
      return (await src?.json?.()) ?? null;
    } catch {
      return null;
    }
  };

  const callRepair = async (previewOnly: boolean) => {
    if (!selectedStudent || !selectedClass || !startDate || !endDate) {
      toast.error("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("repair-attendance", {
        body: {
          studentId: selectedStudent,
          classId: selectedClass,
          startDate,
          endDate,
          defaultStatus,
          preview: previewOnly,
        },
      });

      if (error) {
        const body = await readBody(error);
        if (!previewOnly && needsMoneyDialog(body)) {
          guard.open(
            { entity: "attendance", op: "repair",
              args: { student_id: selectedStudent, class_id: selectedClass, from: startDate, to: endDate, status: defaultStatus } },
            body.preview,
          );
          return;
        }
        const proofText = proofRefusalFromBody(body);
        if (proofText) throw new Error(proofText);
        throw new Error(moneyErrorText(body?.code, body?.kind, body?.error ?? body?.message ?? error.message));
      }

      if (previewOnly) {
        setPreview(data);
        toast.success(`Found ${data.sessions?.length || 0} missing attendance records`);
      } else {
        setPreview(null);
        toast.success(data.message || `Repaired ${data.inserted || 0} attendance records`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to repair attendance");
      if (previewOnly) setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => callRepair(!preview);

  const handleReset = () => {
    setPreview(null);
    setSelectedStudent("");
    setSelectedClass("");
    setStartDate("");
    setEndDate("");
    setDefaultStatus("Present");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Attendance Repair Tool
        </CardTitle>
        <CardDescription>
          Manually seed missing attendance records for a student
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Student</Label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Class</Label>
            <Select
              value={selectedClass}
              onValueChange={setSelectedClass}
              disabled={!selectedStudent}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {enrollments.map((enrollment) => (
                  <SelectItem key={enrollment.class_id} value={enrollment.class_id}>
                    {enrollment.classes.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="space-y-2 col-span-2">
            <Label>Default Status</Label>
            <Select value={defaultStatus} onValueChange={(v: any) => setDefaultStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Present">Present</SelectItem>
                <SelectItem value="Absent">Absent</SelectItem>
                <SelectItem value="Excused">Excused</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {preview && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">{preview.message}</p>
                {preview.sessions && preview.sessions.length > 0 && (
                  <div className="text-sm">
                    <p className="font-medium">Sessions to be repaired:</p>
                    <ul className="list-disc list-inside">
                      {preview.sessions.map((s: any, i: number) => (
                        <li key={i}>
                          {s.date} - Status: {s.status}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handlePreview}
            disabled={loading || !selectedStudent || !selectedClass || !startDate || !endDate}
            className="flex-1"
          >
            {preview ? "Repair Attendance" : "Preview"}
          </Button>
          <Button onClick={handleReset} variant="outline">
            Reset
          </Button>
        </div>
      </CardContent>
      <MoneyGuardDialog
        guard={guard}
        names={Object.fromEntries(students.map((st) => [st.id, st.full_name]))}
      />
    </Card>
  );
}
