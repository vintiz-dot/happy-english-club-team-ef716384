import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, X, UserPlus } from "lucide-react";
import { canSubmitMoney, moneyAck, type MoneyForm, type MoneyPlan } from "@/lib/moneyGuard";
import { functionErrorBody, functionErrorText, needsInputDialogBody } from "@/lib/moneyInputs";
import { MoneyInputDialogView } from "@/components/admin/money-guard/MoneyInputDialog";

interface StudentEnrollment {
  classId: string;
  startDate: string;
  discountType?: "percent" | "amount";
  discountValue?: number;
  discountCadence?: "once" | "monthly";
}

interface FamilyStudent {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  notes: string;
  enrollments: StudentEnrollment[];
}

export function FamilyForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [students, setStudents] = useState<FamilyStudent[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // D4 step 3B (b.5): create-family previews every enrolment before it
  // creates anything. A start date in a month already taught comes back as
  // 409 with the preview; this dialog collects the reason and the same
  // request is sent again with it. Nothing is decided in the browser.
  const [ackPlan, setAckPlan] = useState<(MoneyPlan & { items?: any[] }) | null>(null);
  const [ackForm, setAckForm] = useState<MoneyForm>({ reason: "", confirm: false, correctionReason: "" });
  const [ackError, setAckError] = useState<string | null>(null);

  const { data: classes } = useQuery({
    queryKey: ["classes-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const addStudent = () => {
    setStudents([
      ...students,
      {
        fullName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        notes: "",
        enrollments: [],
      },
    ]);
  };

  const removeStudent = (index: number) => {
    setStudents(students.filter((_, i) => i !== index));
  };

  const updateStudent = (index: number, field: keyof FamilyStudent, value: any) => {
    const updated = [...students];
    updated[index] = { ...updated[index], [field]: value };
    setStudents(updated);
  };

  const addEnrollment = (studentIndex: number) => {
    const updated = [...students];
    updated[studentIndex].enrollments.push({
      classId: "",
      startDate: "",
    });
    setStudents(updated);
  };

  const removeEnrollment = (studentIndex: number, enrollmentIndex: number) => {
    const updated = [...students];
    updated[studentIndex].enrollments = updated[studentIndex].enrollments.filter(
      (_, i) => i !== enrollmentIndex
    );
    setStudents(updated);
  };

  const updateEnrollment = (
    studentIndex: number,
    enrollmentIndex: number,
    field: keyof StudentEnrollment,
    value: any
  ) => {
    const updated = [...students];
    updated[studentIndex].enrollments[enrollmentIndex] = {
      ...updated[studentIndex].enrollments[enrollmentIndex],
      [field]: value,
    };
    setStudents(updated);
  };

  const create = async (ack?: ReturnType<typeof moneyAck>) => {
    setIsSubmitting(true);
    setAckError(null);
    try {
      const { data, error } = await supabase.functions.invoke("create-family", {
        body: {
          name,
          email: email || null,
          phone: phone || null,
          address: address || null,
          students: students.length > 0 ? students : undefined,
          ...(ack ? { ack } : {}),
        },
      });

      if (error) {
        const body = await functionErrorBody(error);
        if (needsInputDialogBody(body)) {
          // nothing was created: ask for the reason (again, with the fresh preview, when it went stale)
          if (ackPlan) setAckError(functionErrorText(body, "Check the dates and confirm again."));
          setAckPlan(body.preview);
          return;
        }
        if (ackPlan && body?.preview) setAckPlan(body.preview);
        const message = functionErrorText(body, error.message);
        if (ackPlan) setAckError(message);
        else throw new Error(message);
        return;
      }
      if (data?.error) throw new Error(data.error);

      setAckPlan(null);
      if (data?.partial) {
        const failed = (data.enrollment_errors ?? []) as Array<{ student_name?: string; message?: string }>;
        toast({
          title: "The family was created, but not every enrolment",
          description: failed.map((f) => `${f.student_name ?? "A child"}: ${f.message ?? "not enrolled"}`).join(" ")
            + " Enrol them from the class's Enrollments tab.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Family created successfully${students.length > 0 ? ` with ${students.length} student(s)` : ""}`,
        });
      }

      // Reset form
      setName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setStudents([]);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) {
      toast({
        title: "Missing Information",
        description: "Please fill in family name",
        variant: "destructive",
      });
      return;
    }
    setAckForm({ reason: "", confirm: false, correctionReason: "" });
    await create();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Create New Family
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Family Information */}
          <div className="space-y-4">
            <h3 className="font-medium">Family Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Family Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g: Nguyen Family"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901234567"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="family@example.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Family address..."
                rows={2}
              />
            </div>

            <Button type="button" variant="outline" size="sm" onClick={addStudent} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </div>

          {students.length > 0 && (
            <>
              <Separator />

              {/* Family Members Section */}
              <div className="space-y-4">
                <h3 className="font-medium">Family Members</h3>

                {students.map((student, studentIndex) => (
              <Card key={studentIndex} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Student {studentIndex + 1}
                    </CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStudent(studentIndex)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label>Student Name *</Label>
                      <Input
                        value={student.fullName}
                        onChange={(e) => updateStudent(studentIndex, "fullName", e.target.value)}
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <Label>Date of Birth</Label>
                      <Input
                        type="date"
                        value={student.dateOfBirth}
                        onChange={(e) => updateStudent(studentIndex, "dateOfBirth", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={student.email}
                        onChange={(e) => updateStudent(studentIndex, "email", e.target.value)}
                        placeholder="student@example.com"
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={student.phone}
                        onChange={(e) => updateStudent(studentIndex, "phone", e.target.value)}
                        placeholder="0901234567"
                      />
                    </div>
                  </div>

                  {/* Enrollments */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Class Enrollments</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addEnrollment(studentIndex)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Class
                      </Button>
                    </div>

                    {student.enrollments.map((enrollment, enrollmentIndex) => (
                      <div key={enrollmentIndex} className="flex gap-2 items-start bg-muted/50 p-3 rounded">
                        <div className="flex-1 grid gap-2 md:grid-cols-2">
                          <div>
                            <Label className="text-xs">Class *</Label>
                            <Select
                              value={enrollment.classId}
                              onValueChange={(value) =>
                                updateEnrollment(studentIndex, enrollmentIndex, "classId", value)
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select class" />
                              </SelectTrigger>
                              <SelectContent>
                                {classes?.map((cls) => (
                                  <SelectItem key={cls.id} value={cls.id}>
                                    {cls.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Start Date</Label>
                            <Input
                              type="date"
                              className="h-8"
                              value={enrollment.startDate}
                              onChange={(e) =>
                                updateEnrollment(studentIndex, enrollmentIndex, "startDate", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Discount Type</Label>
                            <Select
                              value={enrollment.discountType || ""}
                              onValueChange={(value: any) =>
                                updateEnrollment(studentIndex, enrollmentIndex, "discountType", value || undefined)
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percent">Percent</SelectItem>
                                <SelectItem value="amount">Amount (VND)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {enrollment.discountType && (
                            <>
                              <div>
                                <Label className="text-xs">Discount Value</Label>
                                <Input
                                  type="number"
                                  className="h-8"
                                  value={enrollment.discountValue || ""}
                                  onChange={(e) =>
                                    updateEnrollment(
                                      studentIndex,
                                      enrollmentIndex,
                                      "discountValue",
                                      parseInt(e.target.value) || undefined
                                    )
                                  }
                                  placeholder={enrollment.discountType === "percent" ? "10" : "50000"}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Cadence</Label>
                                <Select
                                  value={enrollment.discountCadence || ""}
                                  onValueChange={(value: any) =>
                                    updateEnrollment(
                                      studentIndex,
                                      enrollmentIndex,
                                      "discountCadence",
                                      value || undefined
                                    )
                                  }
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Select" />
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEnrollment(studentIndex, enrollmentIndex)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
              </div>
            </>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating..." : `Create Family${students.length > 0 ? ` with ${students.length} Student(s)` : ""}`}
          </Button>
        </form>
      </CardContent>
      <MoneyInputDialogView
        open={!!ackPlan}
        plan={ackPlan}
        form={ackForm}
        setForm={setAckForm}
        busy={isSubmitting}
        error={ackError}
        canSubmit={canSubmitMoney(ackPlan, ackForm)}
        onClose={() => { setAckPlan(null); setAckError(null); }}
        onSubmit={() => { if (ackPlan) void create(moneyAck(ackPlan, ackForm)); }}
        subject={name}
        extraLines={(ackPlan?.items ?? []).filter((i: any) => Number(i.tier ?? 0) >= 1).map((i: any) =>
          `${i.student_name ?? "A child"}: ${classes?.find((c) => c.id === i.class_id)?.name ?? "a class"} from ${i.start_date}.`)}
      />
    </Card>
  );
}