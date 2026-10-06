import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";
import { fallbackLengthFromSlots, slotLengthMinutes } from "@/lib/classSchedule";
import { formatMinutes } from "@/lib/sessionDuration";

interface WeeklySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const SESSION_RATES = [
  { value: 210000, label: "210,000 VND" },
  { value: 260000, label: "260,000 VND" },
];

export function ClassForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [sessionRate, setSessionRate] = useState(210000);
  const [weeklySlots, setWeeklySlots] = useState<WeeklySlot[]>([]);
  const [description, setDescription] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: teachers } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const addSlot = () => {
    setWeeklySlots([...weeklySlots, { dayOfWeek: 1, startTime: "14:00", endTime: "15:30" }]);
  };

  const removeSlot = (index: number) => {
    setWeeklySlots(weeklySlots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: keyof WeeklySlot, value: number | string) => {
    const updated = [...weeklySlots];
    updated[index] = { ...updated[index], [field]: value };
    setWeeklySlots(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !teacherId || weeklySlots.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all information and add at least one session",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // The weekly slots are the real schedule, but the per-class column is
      // still the fallback for one-off sessions on days the class does not
      // normally run. Without this it stays at the column default of 90 even
      // for a class whose every slot is two hours.
      const fallbackLength = fallbackLengthFromSlots(weeklySlots);

      const { error } = await supabase.from("classes").insert([{
        name,
        default_teacher_id: teacherId,
        session_rate_vnd: sessionRate,
        schedule_template: { weeklySlots } as any,
        ...(fallbackLength ? { default_session_length_minutes: fallbackLength } : {}),
        description: description || null,
        curriculum: curriculum || null,
        age_range: ageRange || null,
      }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "New class created",
      });

      setName("");
      setTeacherId("");
      setSessionRate(210000);
      setWeeklySlots([]);
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
        <CardTitle>Create New Class</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Class Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g: Class A1 - Morning"
            />
          </div>

          <div>
            <Label htmlFor="teacher">Teacher</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Teacher" />
              </SelectTrigger>
              <SelectContent>
                {teachers?.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="rate">Session Fee</Label>
            <Select value={sessionRate.toString()} onValueChange={(v) => setSessionRate(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSION_RATES.map((rate) => (
                  <SelectItem key={rate.value} value={rate.value.toString()}>
                    {rate.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief class description..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Curriculum (optional)</Label>
              <Input
                value={curriculum}
                onChange={(e) => setCurriculum(e.target.value)}
                placeholder="e.g. Oxford Discover 2"
              />
            </div>
            <div>
              <Label>Age Range (optional)</Label>
              <Input
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value)}
                placeholder="e.g. 9-12"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Weekly Schedule</Label>
              <Button type="button" onClick={addSlot} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Session
              </Button>
            </div>

            {weeklySlots.map((slot, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label>Day</Label>
                  <Select
                    value={slot.dayOfWeek.toString()}
                    onValueChange={(v) => updateSlot(index, "dayOfWeek", Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <Label>Start</Label>
                  <Input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateSlot(index, "startTime", e.target.value)}
                  />
                </div>

                <div className="flex-1">
                  <Label className="flex items-center gap-1.5">
                    End
                    {/* The length each day runs, stated as you type it. It is
                        what the session is judged and paid against, and
                        different days are free to differ. */}
                    {(() => {
                      const minutes = slotLengthMinutes(slot);
                      return minutes ? (
                        <span className="text-[10px] font-normal tabular-nums text-muted-foreground">
                          {formatMinutes(minutes)}
                        </span>
                      ) : null;
                    })()}
                  </Label>
                  <Input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateSlot(index, "endTime", e.target.value)}
                  />
                </div>

                <Button
                  type="button"
                  onClick={() => removeSlot(index)}
                  size="icon"
                  variant="ghost"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating..." : "Create Class"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
