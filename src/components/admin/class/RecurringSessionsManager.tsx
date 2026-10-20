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
import {
  indexScheduleVersions,
  pendingVersions,
  versionEndsOn,
  type ScheduleVersion,
} from "@/lib/scheduleHistory";

interface RecurringSessionsManagerProps {
  classId: string;
}

/** The slots are raw JSON, so a half-typed time must not render as NaN. */
const slotDuration = (slot: any): number | null =>
  durationMinutes(slot?.startTime, slot?.endTime) || null;

export default function RecurringSessionsManager({ classId }: RecurringSessionsManagerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  // Today, captured once per render rather than read at each comparison, so
  // a long-lived page does not start disagreeing with itself across midnight.
  const [today] = useState(() => dayjs().format("YYYY-MM-DD"));
  /**
   * When the edits being made should start applying.
   *
   * Defaults to today, which reproduces the old behaviour exactly: the
   * change takes effect now. Setting it forward is the feature - the class
   * keeps running its current pattern until that date, and only then moves.
   *
   * It is deliberately NOT possible to set this to a past date. Backdating
   * a timetable would re-describe lessons that have already been taught and
   * paid, which is the thing schedule history exists to prevent.
   */
  const [effectiveFrom, setEffectiveFrom] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [changeNote, setChangeNote] = useState("");
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

  const { data: versions } = useQuery({
    queryKey: ["class-schedule-versions", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_schedule_versions")
        .select("id, class_id, effective_from, weekly_slots, default_session_length_minutes, note, created_at")
        .eq("class_id", classId)
        .order("effective_from", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ScheduleVersion[];
    },
  });

  const sortedVersions = (indexScheduleVersions(versions).get(classId) ?? []);
  const upcoming = pendingVersions(sortedVersions, today);
  const past = sortedVersions.filter((v) => v.effective_from <= today);

  const scheduleTemplate = classData?.schedule_template as any;
  const weeklySlots = scheduleTemplate?.weeklySlots || [];

  const updateTemplateMutation = useMutation({
    mutationFn: async (newSlots: any[]) => {
      // These slots ARE the schedule a session's length is judged against, so
      // different days may legitimately run different lengths. The per-class
      // column is only the fallback for a one-off on a day the class does not
      // normally run — kept in step here so it is never silently stale.
      const fallbackLength = fallbackLengthFromSlots(parseWeeklySlots({ weeklySlots: newSlots }));

      // 1. Record the change as a version. Upsert on (class_id,
      //    effective_from): editing several slots for the same start date is
      //    one timetable change, not one per slot, and the unique constraint
      //    says so.
      const { error: versionError } = await supabase
        .from("class_schedule_versions")
        .upsert(
          {
            class_id: classId,
            effective_from: effectiveFrom,
            weekly_slots: newSlots,
            default_session_length_minutes: fallbackLength ?? null,
            note: changeNote.trim() || null,
          },
          { onConflict: "class_id,effective_from" },
        );
      if (versionError) throw versionError;

      // 2. classes.schedule_template mirrors the version in force NOW, and
      //    about twenty screens read it to answer "when does this class
      //    meet?". A change dated in the future must not move it yet, or
      //    the catalogue would advertise a timetable the class is not on.
      //    is_teacher_of_class reads class_slots_on rather than this column
      //    precisely so access still flips on the right date by itself.
      if (effectiveFrom <= today) {
        const { error } = await supabase
          .from("classes")
          .update({
            schedule_template: { weeklySlots: newSlots },
            ...(fallbackLength ? { default_session_length_minutes: fallbackLength } : {}),
          })
          .eq("id", classId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(
        effectiveFrom <= today
          ? "Recurring sessions updated"
          : `Saved — this takes effect on ${dayjs(effectiveFrom).format("D MMM YYYY")}`,
      );
      queryClient.invalidateQueries({ queryKey: ["class-recurring", classId] });
      queryClient.invalidateQueries({ queryKey: ["class-schedule-versions", classId] });
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
        {/* When the edits below start applying. Previous schedules are kept
            as history rather than overwritten, so lessons already taught
            keep being judged against the timetable they actually ran on. */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <Label htmlFor="effective-from" className="text-xs font-semibold">
                Changes take effect from
              </Label>
              <Input
                id="effective-from"
                type="date"
                value={effectiveFrom}
                min={today}
                onChange={(e) => setEffectiveFrom(e.target.value || today)}
              />
            </div>
            <div className="flex-[2] min-w-[200px]">
              <Label htmlFor="change-note" className="text-xs font-semibold">
                Why <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="change-note"
                placeholder="Moves to Tuesday for the new term"
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {effectiveFrom <= today ? (
              <>
                Applies straight away. Lessons already taught keep the schedule they ran on —
                nothing in the past is rewritten.
              </>
            ) : (
              <>
                The class keeps its current pattern until{" "}
                <strong className="text-foreground">
                  {dayjs(effectiveFrom).format("D MMM YYYY")}
                </strong>
                , then moves. Sessions before that date are left alone.
              </>
            )}
            {" "}You cannot set a date in the past: that would re-describe lessons that have
            already happened and been paid.
          </p>
        </div>

        {upcoming.length > 0 && (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs font-semibold">Scheduled change{upcoming.length === 1 ? "" : "s"}</p>
            <ul className="mt-1.5 space-y-1">
              {upcoming.map((v) => (
                <li key={v.effective_from} className="text-xs text-muted-foreground">
                  <strong className="text-foreground">
                    {dayjs(v.effective_from).format("D MMM YYYY")}
                  </strong>
                  {" — "}
                  {(Array.isArray(v.weekly_slots) ? v.weekly_slots.length : 0)} slot
                  {(Array.isArray(v.weekly_slots) ? v.weekly_slots.length : 0) === 1 ? "" : "s"}
                  {v.note ? ` · ${v.note}` : ""}
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Not showing below yet — the list underneath is the timetable running today.
            </p>
          </div>
        )}

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

        {/* The point of the whole change: previous schedules are kept, not
            overwritten. Showing them is also the only way an admin can tell
            that a flagged "wrong length" session was correct at the time. */}
        {past.length > 1 && (
          <div className="rounded-lg border p-3">
            <p className="text-xs font-semibold">Schedule history</p>
            <ul className="mt-2 space-y-1.5">
              {past.map((v, i) => {
                const endsOn = versionEndsOn(sortedVersions, v);
                const slotCount = Array.isArray(v.weekly_slots) ? v.weekly_slots.length : 0;
                return (
                  <li key={v.effective_from} className="text-xs">
                    <span className="font-medium">
                      {v.effective_from === "1900-01-01"
                        ? "Until "
                        : dayjs(v.effective_from).format("D MMM YYYY") + " – "}
                      {endsOn ? dayjs(endsOn).format("D MMM YYYY") : "now"}
                    </span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {slotCount} slot{slotCount === 1 ? "" : "s"}
                      {v.note ? ` · ${v.note}` : ""}
                      {i === 0 ? " · in force" : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Payroll judges each lesson against the schedule in force on its own date, so a
              change here never makes finished months look wrong.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
