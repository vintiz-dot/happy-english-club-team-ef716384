import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Users, X, Calendar } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useMoneyInput } from "@/components/admin/money-guard/useMoneyInput";
import { MoneyInputDialog } from "@/components/admin/money-guard/MoneyInputDialog";

interface Student {
  id: string;
  full_name: string;
  family_id: string | null;
}

interface Class {
  id: string;
  name: string;
  schedule_template: {
    weeklySlots?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  } | null;
}

interface Enrollment {
  id: string;
  student_id: string;
  class_id: string;
  start_date: string;
  end_date: string | null;
  discount_type: string | null;
  discount_value: number | null;
  discount_cadence: string | null;
  allowed_days: number[] | null;
  students: { full_name: string };
  classes: { name: string };
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function EnrollmentManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [startDate, setStartDate] = useState("");
  const [discountType, setDiscountType] = useState<"" | "percent" | "amount">("");
  const [discountValue, setDiscountValue] = useState("");
  const [discountCadence, setDiscountCadence] = useState<"" | "once" | "monthly">("");
  const [allowedDays, setAllowedDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  // D4 step 3B (G-13): enrolling and ending an enrolment are checked changes
  // made as the signed-in admin. From today they are tier 0 (no dialog, one
  // row written); a date in a month already billed asks for a reason.
  const money = useMoneyInput((_result, request) => {
    toast({
      title: "Success",
      description: request.op === "end" ? "Enrollment ended" : "Student enrolled successfully",
    });
    if (request.op !== "end") resetForm();
    loadData();
  });
  const { toast } = useToast();

  // Get class schedule days
  const selectedClassData = classes.find(c => c.id === selectedClass);
  const classScheduleDays = selectedClassData?.schedule_template?.weeklySlots?.map(s => s.dayOfWeek) ?? [];
  const uniqueClassDays = [...new Set(classScheduleDays)].sort();

  useEffect(() => {
    loadData();
  }, []);

  // Reset allowed days when class changes
  useEffect(() => {
    setAllowedDays([]);
  }, [selectedClass]);

  const loadData = async () => {
    try {
      const [studentsRes, classesRes, enrollmentsRes] = await Promise.all([
        supabase.from("students").select("id, full_name, family_id").eq("is_active", true),
        supabase.from("classes").select("id, name, schedule_template").eq("is_active", true),
        supabase
          .from("enrollments" as any)
          .select("*, students(full_name), classes(name)")
          .is("end_date", null)
          .order("created_at", { ascending: false }),
      ]);

      if (studentsRes.data) setStudents(studentsRes.data);
      if (classesRes.data) setClasses(classesRes.data as Class[]);
      if (enrollmentsRes.data) setEnrollments(enrollmentsRes.data as any);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDayToggle = (day: number) => {
    setAllowedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleEnroll = async () => {
    if (!selectedStudent || !selectedClass) {
      toast({
        title: "Missing fields",
        description: "Please select both student and class",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Check for duplicate active enrollment
      const { data: existing } = await supabase
        .from("enrollments" as any)
        .select("id")
        .eq("student_id", selectedStudent)
        .eq("class_id", selectedClass)
        .is("end_date", null)
        .single();

      if (existing) {
        toast({
          title: "Duplicate enrollment",
          description: "Student is already enrolled in this class",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const enrollmentData: any = {
        student_id: selectedStudent,
        class_id: selectedClass,
        start_date: startDate || new Date().toISOString().split("T")[0],
      };

      if (discountType && discountValue && discountCadence) {
        enrollmentData.discount_type = discountType;
        enrollmentData.discount_value = parseInt(discountValue);
        enrollmentData.discount_cadence = discountCadence;
      }

      // Add allowed_days if specific days are selected
      if (allowedDays.length > 0 && allowedDays.length < uniqueClassDays.length) {
        enrollmentData.allowed_days = allowedDays;
      }

      const r = await money.run({
        entity: "enrollment",
        op: "enroll",
        args: {
          student_id: enrollmentData.student_id,
          class_id: enrollmentData.class_id,
          start_date: enrollmentData.start_date,
          ...(enrollmentData.discount_type
            ? { discount_type: enrollmentData.discount_type, discount_value: enrollmentData.discount_value,
                discount_cadence: enrollmentData.discount_cadence }
            : {}),
          ...(enrollmentData.allowed_days ? { allowed_days: enrollmentData.allowed_days } : {}),
        },
      });
      if (r.status === "refused") throw new Error(r.message);
      if (r.status === "dialog") return;      // the reason dialog is open; confirming it finishes

      toast({
        title: "Success",
        description: allowedDays.length > 0 && allowedDays.length < uniqueClassDays.length
          ? `Student enrolled for ${allowedDays.map(d => DAY_NAMES[d]).join(", ")} only`
          : "Student enrolled successfully",
      });

      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedStudent("");
    setSelectedClass("");
    setStartDate("");
    setDiscountType("");
    setDiscountValue("");
    setDiscountCadence("");
    setAllowedDays([]);
  };

  const handleUnenroll = async (enrollmentId: string) => {
    if (!confirm("Are you sure you want to end this enrollment?")) return;

    try {
      const row = enrollments.find((e) => e.id === enrollmentId);
      if (!row) return;
      const r = await money.run({
        entity: "enrollment",
        op: "end",
        args: { student_id: row.student_id, class_id: row.class_id, end_date: new Date().toISOString().split("T")[0] },
      });
      if (r.status === "refused") throw new Error(r.message);
      if (r.status === "dialog") return;

      toast({
        title: "Success",
        description: "Enrollment ended",
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Enroll Student
          </CardTitle>
          <CardDescription>Add a student to a class with optional enrollment discount and day restrictions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Student *</Label>
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
              <Label>Class *</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            {/* Allowed Days Picker */}
            {selectedClass && uniqueClassDays.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Days Attending
                </Label>
                <div className="flex flex-wrap gap-2">
                  {uniqueClassDays.map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day}`}
                        checked={allowedDays.length === 0 || allowedDays.includes(day)}
                        onCheckedChange={() => {
                          if (allowedDays.length === 0) {
                            // First click: select only this day
                            setAllowedDays([day]);
                          } else {
                            handleDayToggle(day);
                          }
                        }}
                      />
                      <label
                        htmlFor={`day-${day}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {DAY_NAMES[day]}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {allowedDays.length === 0 
                    ? "All class days selected (default)" 
                    : `Only ${allowedDays.map(d => DAY_NAMES[d]).join(", ")} - student won't be billed for other days`}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent</SelectItem>
                  <SelectItem value="amount">Amount (VND)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {discountType && (
              <>
                <div className="space-y-2">
                  <Label>Discount Value</Label>
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "percent" ? "e.g. 10 for 10%" : "e.g. 50000"}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Discount Cadence</Label>
                  <Select value={discountCadence} onValueChange={(v: any) => setDiscountCadence(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cadence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Once</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <Button onClick={handleEnroll} disabled={loading} className="w-full mt-4">
            Enroll Student
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Enrollments</CardTitle>
          <CardDescription>Current student enrollments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {enrollments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No active enrollments</p>
            ) : (
              enrollments.map((enrollment) => (
                <div key={enrollment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{enrollment.students.full_name}</p>
                    <p className="text-sm text-muted-foreground">{enrollment.classes.name}</p>
                    <div className="flex flex-wrap gap-1">
                      {enrollment.allowed_days && enrollment.allowed_days.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {enrollment.allowed_days.map(d => DAY_NAMES[d]).join(", ")} only
                        </Badge>
                      )}
                      {enrollment.discount_type && (
                        <Badge variant="secondary" className="text-xs">
                          {enrollment.discount_cadence} discount: {enrollment.discount_value}
                          {enrollment.discount_type === "percent" ? "%" : " VND"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnenroll(enrollment.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      <MoneyInputDialog
        guard={money.guard}
        names={Object.fromEntries(students.map((s) => [s.id, s.full_name]))}
        subject={students.find((s) => s.id === money.guard.request?.args?.student_id)?.full_name}
      />
    </div>
  );
}