import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { PastAttendanceEditor } from "@/components/admin/PastAttendanceEditor";
import { assertClassNameAvailable } from "@/components/admin/class/ClassAdminActions";
import { useQueryClient } from "@tanstack/react-query";
import { describePattern, parseWeeklySlots } from "@/lib/classSchedule";

const ClassSettings = ({ classId }: { classId: string }) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [defaultTeacherId, setDefaultTeacherId] = useState("");
  const [sessionRate, setSessionRate] = useState(0);
  const [defaultStartTime, setDefaultStartTime] = useState("");
  const [defaultEndTime, setDefaultEndTime] = useState("");
  const [defaultSessionLength, setDefaultSessionLength] = useState(90);
  const [curriculum, setCurriculum] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [description, setDescription] = useState("");
  const [maxStudents, setMaxStudents] = useState<number | "">("");
  const [economyMode, setEconomyMode] = useState(false);
  const [pointsToCashRate, setPointsToCashRate] = useState(50);
  const [visibilitySettings, setVisibilitySettings] = useState({
    curriculum: true,
    age_range: true,
    description: true,
    teacher_info: true,
  });
  const [saving, setSaving] = useState(false);

  const { data: classData } = useQuery({
    queryKey: ["class", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("id", classId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // The lengths this class actually runs, read off its weekly slots.
  const weeklyPattern = describePattern(parseWeeklySlots(classData?.schedule_template));

  const { data: teachers } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (classData) {
      setName(classData.name || "");
      setDefaultTeacherId(classData.default_teacher_id || "");
      setSessionRate(classData.session_rate_vnd || 0);
      setDefaultSessionLength(classData.default_session_length_minutes || 90);
      setCurriculum((classData as any).curriculum || "");
      setAgeRange((classData as any).age_range || "");
      setDescription((classData as any).description || "");
      setMaxStudents((classData as any).max_students || "");
      setEconomyMode((classData as any).economy_mode || false);
      setPointsToCashRate((classData as any).points_to_cash_rate || 50);
      if ((classData as any).visibility_settings) {
        setVisibilitySettings({
          curriculum: true,
          age_range: true,
          description: true,
          teacher_info: true,
          ...((classData as any).visibility_settings as Record<string, boolean>),
        });
      }
      
      if (classData.typical_start_times && Array.isArray(classData.typical_start_times)) {
        const firstTime = classData.typical_start_times[0];
        setDefaultStartTime(typeof firstTime === 'string' ? firstTime : "");
      }
    }
  }, [classData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate the name only when it actually changed. Two classes in the
      // existing data could already share a name, and that must not block an
      // admin who came here to edit the session rate.
      const nameChanged = name.trim() !== (classData?.name ?? "");
      if (nameChanged) {
        // Throws on a blank name or a clash, before anything is written.
        await assertClassNameAvailable(classId, name);
      }

      const updateData: any = {
        ...(nameChanged ? { name: name.trim() } : {}),
        default_teacher_id: defaultTeacherId || null,
        session_rate_vnd: sessionRate,
        default_session_length_minutes: defaultSessionLength,
        curriculum: curriculum || null,
        age_range: ageRange || null,
        description: description || null,
        max_students: maxStudents || null,
        visibility_settings: visibilitySettings,
        economy_mode: economyMode,
        points_to_cash_rate: pointsToCashRate,
      };

      if (defaultStartTime) {
        updateData.typical_start_times = [defaultStartTime];
      }

      const { error } = await supabase
        .from("classes")
        .update(updateData)
        .eq("id", classId);

      if (error) throw error;

      // A rename is the change people ask about months later ("why is this
      // class called that now?"), so it is recorded.
      if (nameChanged) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("audit_log").insert({
          entity: "classes",
          action: "rename",
          entity_id: classId,
          actor_user_id: user?.id ?? null,
          diff: { old_name: classData?.name ?? null, new_name: name.trim() },
        });
      }

      // Trigger recalculations for affected students and teachers
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      // Get all enrollments for this class
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("class_id", classId);

      // Recalculate tuition for each student
      if (enrollments && enrollments.length > 0) {
        const studentIds = enrollments.map(e => e.student_id);
        console.log(`Recalculating tuition for ${studentIds.length} students`);
        
        // Trigger tuition recalculation for each student
        for (const studentId of studentIds) {
          await supabase.functions.invoke("calculate-tuition", {
            body: { studentId, month: currentMonth },
          }).catch(err => console.error(`Failed to recalculate tuition for student ${studentId}:`, err));
        }
      }

      // Get teachers for this class and recalculate payroll
      const { data: sessions } = await supabase
        .from("sessions")
        .select("teacher_id")
        .eq("class_id", classId)
        .gte("date", `${currentMonth}-01`)
        .lte("date", `${currentMonth}-31`);

      if (sessions && sessions.length > 0) {
        const teacherIds = [...new Set(sessions.map(s => s.teacher_id))];
        console.log(`Recalculating payroll for ${teacherIds.length} teachers`);
        
        for (const teacherId of teacherIds) {
          await supabase.functions.invoke("calculate-payroll", {
            body: { teacherId, month: currentMonth },
          }).catch(err => console.error(`Failed to recalculate payroll for teacher ${teacherId}:`, err));
        }
      }

      // So the page heading and every class list pick up a renamed class.
      queryClient.invalidateQueries({ queryKey: ["class", classId] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });

      toast.success("Class settings updated and calculations triggered");
    } catch (error: any) {
      console.error("Error updating class:", error);
      toast.error(error.message || "Failed to update class settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="settings" className="w-full">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="attendance">Past Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Class Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Class Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Class A1 — Morning"
                />
                <p className="text-xs text-muted-foreground">
                  Shown everywhere: schedules, reports, invoices and the student app.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Default Teacher</Label>
                <Select value={defaultTeacherId} onValueChange={setDefaultTeacherId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select default teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers?.filter(t => t.id).map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Session Rate (VND)</Label>
                <Input
                  type="number"
                  value={sessionRate}
                  onChange={(e) => setSessionRate(Number(e.target.value) || 0)}
                  placeholder="Enter session rate"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fallback Session Length (minutes)</Label>
                  <Input
                    type="number"
                    value={defaultSessionLength}
                    onChange={(e) => setDefaultSessionLength(Number(e.target.value) || 90)}
                    placeholder="90"
                  />
                  {/* This used to be what every session was checked against,
                      which flagged a correct day every week for any class
                      running two lengths. The weekly schedule now decides. */}
                  <p className="text-xs text-muted-foreground">
                    {weeklyPattern
                      ? `Each day is checked against its own slot — this class runs ${weeklyPattern}. Used only for a one-off on a day the class doesn't normally run.`
                      : "Used for sessions on days this class has no weekly slot for. Set the weekly schedule to have each day checked against its own length."}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Default Start Time</Label>
                  <Input
                    type="time"
                    value={defaultStartTime}
                    onChange={(e) => setDefaultStartTime(e.target.value)}
                    placeholder="17:30"
                  />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save Settings"}
              </Button>

              <Separator className="my-4" />

              {/* Class Metadata */}
              <h3 className="text-lg font-semibold">Class Information</h3>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the class..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Curriculum</Label>
                  <Input
                    value={curriculum}
                    onChange={(e) => setCurriculum(e.target.value)}
                    placeholder="e.g. Oxford Discover 2"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Age Range</Label>
                  <Input
                    value={ageRange}
                    onChange={(e) => setAgeRange(e.target.value)}
                    placeholder="e.g. 9-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Max Students</Label>
                <Input
                  type="number"
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(e.target.value ? Number(e.target.value) : "")}
                  placeholder="No limit"
                />
              </div>

              <Separator className="my-4" />

              {/* Economy Mode */}
              <h3 className="text-lg font-semibold">🏦 Classroom Economy</h3>
              <p className="text-sm text-muted-foreground">Enable banking and currency system for this class</p>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Economy Mode</Label>
                  <p className="text-xs text-muted-foreground">Points accumulate indefinitely (no monthly reset)</p>
                </div>
                <Switch
                  checked={economyMode}
                  onCheckedChange={setEconomyMode}
                />
              </div>

              {economyMode && (
                <div className="space-y-2">
                  <Label>Points to Cash Rate</Label>
                  <Input
                    type="number"
                    min={1}
                    value={pointsToCashRate}
                    onChange={(e) => setPointsToCashRate(Number(e.target.value) || 50)}
                    placeholder="50"
                  />
                  <p className="text-xs text-muted-foreground">
                    How many points = 1 physical cash unit (e.g., 50 pts = 1 unit)
                  </p>
                </div>
              )}

              <Separator className="my-4" />

              {/* Visibility Toggles */}
              <h3 className="text-lg font-semibold">Public Visibility</h3>
              <p className="text-sm text-muted-foreground">Control what prospective students can see</p>

              <div className="space-y-3">
                {[
                  { key: "curriculum" as const, label: "Curriculum" },
                  { key: "age_range" as const, label: "Age Range" },
                  { key: "description" as const, label: "Description" },
                  { key: "teacher_info" as const, label: "Teacher Info" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label>{label}</Label>
                    <Switch
                      checked={visibilitySettings[key]}
                      onCheckedChange={(checked) =>
                        setVisibilitySettings((prev) => ({ ...prev, [key]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save All Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <PastAttendanceEditor classId={classId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClassSettings;
