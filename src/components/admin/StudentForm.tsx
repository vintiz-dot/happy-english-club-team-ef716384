import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";
import { format } from "date-fns";

export function StudentForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [familyId, setFamilyId] = useState("");
  const [notes, setNotes] = useState("");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: families } = useQuery({
    queryKey: ["families"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("families")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: classes } = useQuery({
    queryKey: ["active-classes-enroll-on-create"],
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

  const toggleClass = (id: string) =>
    setClassIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName) {
      toast({
        title: "Missing Information",
        description: "Please fill in student name",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // `.select()` so the new id is available to enrol with — the insert
      // returns nothing otherwise.
      const { data: created, error } = await supabase
        .from("students")
        .insert([{
          full_name: fullName,
          email: email || null,
          phone: phone || null,
          date_of_birth: dateOfBirth || null,
          family_id: familyId || null,
          notes: notes || null,
        }])
        .select("id")
        .single();

      if (error) throw error;

      // Enrol into the chosen classes. The student already exists at this
      // point and the browser cannot wrap the two writes in a transaction, so
      // a failure here must be reported as exactly what it is — student saved,
      // enrolment not — rather than as a blanket error that would have the
      // admin create the child a second time.
      let enrolErrorMessage: string | null = null;
      if (classIds.length > 0) {
        const { error: enrolError } = await supabase.from("enrollments").insert(
          classIds.map((classId) => ({
            class_id: classId,
            student_id: created.id,
            start_date: startDate,
          })),
        );
        if (enrolError) {
          enrolErrorMessage = enrolError.message;
        } else {
          // So the class roster and enrolment counts show the new student
          // without a reload.
          queryClient.invalidateQueries({ queryKey: ["classes"] });
          classIds.forEach((classId) => {
            queryClient.invalidateQueries({ queryKey: ["class-enrollments", classId] });
            queryClient.invalidateQueries({ queryKey: ["available-students", classId] });
          });
        }
      }

      if (enrolErrorMessage) {
        toast({
          title: `${fullName} was created, but not enrolled`,
          description: `Add the class from the class's Enrollments tab. (${enrolErrorMessage})`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description:
            classIds.length > 0
              ? `Student created and enrolled in ${classIds.length} class${classIds.length === 1 ? "" : "es"}`
              : "Student created successfully",
        });
      }

      // Reset form
      setFullName("");
      setEmail("");
      setPhone("");
      setDateOfBirth("");
      setFamilyId("");
      setNotes("");
      setClassIds([]);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Create New Student
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g: Nguyen Van B"
              />
            </div>

            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
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
              <Label htmlFor="family">Family (Optional)</Label>
              <Select value={familyId} onValueChange={setFamilyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select family or leave blank" />
                </SelectTrigger>
                <SelectContent>
                  {families?.map((family) => (
                    <SelectItem key={family.id} value={family.id}>
                      {family.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Enrol on creation. A new student almost always exists BECAUSE
              they are joining a class, so making this a second trip through
              the class's Enrollments tab is pure friction. */}
          <div className="space-y-3 rounded-lg border p-4">
            <div>
              <Label>Enroll in classes (optional)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tick every class this student is joining now. You can change this later.
              </p>
            </div>

            <div className="max-h-48 overflow-auto rounded border p-3 space-y-2">
              {classes?.map((cls) => (
                <div key={cls.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`enroll-${cls.id}`}
                    checked={classIds.includes(cls.id)}
                    onCheckedChange={() => toggleClass(cls.id)}
                  />
                  <label htmlFor={`enroll-${cls.id}`} className="cursor-pointer flex-1 text-sm">
                    {cls.name}
                  </label>
                </div>
              ))}
              {!classes?.length && (
                <p className="text-sm text-muted-foreground text-center">No active classes yet</p>
              )}
            </div>

            {classIds.length > 0 && (
              <div className="max-w-xs">
                <Label htmlFor="enrollStartDate">Enrollment start date</Label>
                <Input
                  id="enrollStartDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tuition is counted from this date.
                </p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional information about the student..."
              rows={3}
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting
              ? "Creating..."
              : classIds.length > 0
                ? `Create Student & Enroll in ${classIds.length} Class${classIds.length === 1 ? "" : "es"}`
                : "Create Student"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
