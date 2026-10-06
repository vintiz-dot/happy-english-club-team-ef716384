import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { dayjs } from "@/lib/date";
import { durationMinutes, formatMinutes } from "@/lib/sessionDuration";
import { fallbackLengthFromSlots, parseWeeklySlots } from "@/lib/classSchedule";

interface RecurringSessionsManagerProps {
  classId: string;
}

/** The slots are raw JSON, so a half-typed time must not render as NaN. */
const slotDuration = (slot: any): number | null =>
  durationMinutes(slot?.startTime, slot?.endTime) || null;

export default function RecurringSessionsManager({ classId }: RecurringSessionsManagerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newSession, setNewSession] = useState({
    dayOfWeek: "",
    startTime: "",
    endTime: "",
    teacherId: "",
  });
  const queryClient = useQueryClient();

  const { data: classData } = useQuery({
    queryKey: ["class-recurring", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*, teachers(id, full_name)")
        .eq("id", classId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ["active-teachers"],
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

  const scheduleTemplate = classData?.schedule_template as any;
  const weeklySlots = scheduleTemplate?.weeklySlots || [];

  const updateTemplateMutation = useMutation({
    mutationFn: async (newSlots: any[]) => {
      // These slots ARE the schedule a session's length is judged against, so
      // different days may legitimately run different lengths. The per-class
      // column is only the fallback for a one-off on a day the class does not
      // normally run — kept in step here so it is never silently stale.
      const fallbackLength = fallbackLengthFromSlots(parseWeeklySlots({ weeklySlots: newSlots }));

      const { error } = await supabase
        .from("classes")
        .update({
          schedule_template: {
            weeklySlots: newSlots,
          },
          ...(fallbackLength ? { default_session_length_minutes: fallbackLength } : {}),
        })
        .eq("id", classId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recurring sessions updated");
      queryClient.invalidateQueries({ queryKey: ["class-recurring", classId] });
      setEditingIndex(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update recurring sessions");
    },
  });

  const handleAddSession = () => {
    if (!newSession.dayOfWeek || !newSession.startTime || !newSession.endTime) {
      toast.error("Please fill in all fields");
      return;
    }

    const updatedSlots = [
      ...weeklySlots,
      {
        dayOfWeek: parseInt(newSession.dayOfWeek),
        startTime: newSession.startTime,
        endTime: newSession.endTime,
        teacherId: newSession.teacherId || classData?.default_teacher_id || null,
      },
    ];

    updateTemplateMutation.mutate(updatedSlots);
    setNewSession({ dayOfWeek: "", startTime: "", endTime: "", teacherId: "" });
  };

  const handleDeleteSession = (index: number) => {
    const updatedSlots = weeklySlots.filter((_: any, i: number) => i !== index);
    updateTemplateMutation.mutate(updatedSlots);
  };

  const handleSaveEdit = (index: number, updatedSlot: any) => {
    const updatedSlots = [...weeklySlots];
    updatedSlots[index] = updatedSlot;
    updateTemplateMutation.mutate(updatedSlots);
  };

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recurring Sessions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {weeklySlots.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No recurring sessions configured</p>
          ) : (
            weeklySlots.map((slot: any, index: number) => (
              <Card key={index} className="p-4">
                {editingIndex === index ? (
                  <div className="grid grid-cols-4 gap-3">
                    <Select
                      value={slot.dayOfWeek.toString()}
                      onValueChange={(v) => {
                        const updated = { ...slot, dayOfWeek: parseInt(v) };
                        handleSaveEdit(index, updated);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dayNames.map((day, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => {
                        const updated = { ...slot, startTime: e.target.value };
                        handleSaveEdit(index, updated);
                      }}
                    />
                    <Input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => {
                        const updated = { ...slot, endTime: e.target.value };
                        handleSaveEdit(index, updated);
                      }}
                    />
                    <Button variant="outline" size="sm" onClick={() => setEditingIndex(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge>{dayNames[slot.dayOfWeek]}</Badge>
                        <span className="text-sm">
                          {slot.startTime} - {slot.endTime}
                        </span>
                        {/* The length this day runs. Shown because it is what
                            a session on this day is checked and paid against,
                            and because two days of the same class differing
                            is normal and used to look like a bug. */}
                        {slotDuration(slot) && (
                          <Badge variant="secondary" className="tabular-nums">
                            {formatMinutes(slotDuration(slot) as number)}
                          </Badge>
                        )}
                      </div>
                      {slot.teacherId && teachers && (
                        <p className="text-xs text-muted-foreground">
                          Teacher: {teachers.find((t) => t.id === slot.teacherId)?.full_name || "Default"}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingIndex(index)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSession(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        <Card className="p-4 bg-muted/50">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Recurring Session
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Day of Week</Label>
              <Select value={newSession.dayOfWeek} onValueChange={(v) => setNewSession({ ...newSession, dayOfWeek: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {dayNames.map((day, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Start Time</Label>
              <Input
                type="time"
                value={newSession.startTime}
                onChange={(e) => setNewSession({ ...newSession, startTime: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">End Time</Label>
              <Input
                type="time"
                value={newSession.endTime}
                onChange={(e) => setNewSession({ ...newSession, endTime: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Teacher (Optional)</Label>
              <Select value={newSession.teacherId || "default"} onValueChange={(v) => setNewSession({ ...newSession, teacherId: v === "default" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Use Default Teacher</SelectItem>
                  {teachers?.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleAddSession} className="w-full mt-3" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Session
          </Button>
        </Card>
      </CardContent>
    </Card>
  );
}
