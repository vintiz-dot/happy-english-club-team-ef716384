import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Calendar, Clock, User, Send, CheckCircle, Loader2 } from "lucide-react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ClassCatalogProps {
  studentId: string;
}

export function ClassCatalog({ studentId }: ClassCatalogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [message, setMessage] = useState("");

  // Fetch active classes with teacher info
  const { data: classes, isLoading } = useQuery({
    queryKey: ["class-catalog"],
    queryFn: async () => {
      const { data } = await supabase
        .from("classes")
        .select("id, name, schedule_template, default_teacher_id, default_session_length_minutes, curriculum, age_range, description, visibility_settings")
        .eq("is_active", true)
        .order("name");

      if (!data) return [];

      // Fetch teacher names + bios for classes that have default teachers
      const teacherIds = [...new Set(data.filter(c => c.default_teacher_id).map(c => c.default_teacher_id!))];
      let teacherMap: Record<string, { name: string; bio: string | null }> = {};
      if (teacherIds.length > 0) {
        const { data: teachers } = await supabase
          .from("teachers")
          .select("id, full_name, bio")
          .in("id", teacherIds);
        teacherMap = Object.fromEntries((teachers || []).map(t => [t.id, { name: t.full_name, bio: t.bio }]));
      }

      return data.map(c => {
        const vis = (c as any).visibility_settings || { curriculum: true, age_range: true, description: true, teacher_info: true };
        const teacher = c.default_teacher_id ? teacherMap[c.default_teacher_id] : null;
        return {
          ...c,
          teacherName: teacher?.name || null,
          teacherBio: vis.teacher_info ? (teacher?.bio || null) : null,
          showCurriculum: vis.curriculum,
          showAgeRange: vis.age_range,
          showDescription: vis.description,
          slots: (c.schedule_template as any)?.weeklySlots || [],
        };
      });
    },
  });

  // Fetch existing requests to disable already-requested classes
  const { data: existingRequests } = useQuery({
    queryKey: ["enrollment-requests", studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollment_requests" as any)
        .select("class_id, status")
        .eq("student_id", studentId)
        .in("status", ["pending"]);
      return (data as any[]) || [];
    },
    enabled: !!studentId,
  });

  const pendingClassIds = new Set((existingRequests || []).map((r: any) => r.class_id));

  const requestMutation = useMutation({
    mutationFn: async ({ classId, msg }: { classId: string; msg: string }) => {
      const { error } = await supabase
        .from("enrollment_requests" as any)
        .insert({
          student_id: studentId,
          class_id: classId,
          message: msg || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Request Sent! 🎉", description: "The admin will review your request shortly." });
      queryClient.invalidateQueries({ queryKey: ["enrollment-requests", studentId] });
      setSelectedClass(null);
      setMessage("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-hec-ink-soft" />
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes?.map((cls, i) => {
          const isPending = pendingClassIds.has(cls.id);
          const uniqueDays = [...new Set(cls.slots.map((s: any) => s.dayOfWeek))].sort() as number[];

          return (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: Math.min(i, 6) * 0.03 }}
            >
              <Card className="group relative h-full overflow-hidden">
                <CardContent className="relative space-y-4 p-4 sm:p-5">
                  <div className="min-w-0">
                    <h3 className="whitespace-normal break-words font-display text-hec-h2 font-medium text-hec-ink">{cls.name}</h3>
                    {cls.teacherName && (
                      <p className="mt-1 flex items-start gap-1.5 text-hec-small text-hec-ink-soft">
                        <User className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0 whitespace-normal break-words">{cls.teacherName}</span>
                      </p>
                    )}
                    {cls.teacherBio && (
                      <p className="mt-1 line-clamp-2 text-hec-caption text-hec-ink-soft">{cls.teacherBio}</p>
                    )}
                  </div>

                  {/* Class metadata */}
                  {(cls.showDescription && (cls as any).description) && (
                    <p className="text-hec-small text-hec-ink-soft">{(cls as any).description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {cls.showCurriculum && (cls as any).curriculum && (
                      <Badge variant="secondary" className="text-hec-caption">📚 {(cls as any).curriculum}</Badge>
                    )}
                    {cls.showAgeRange && (cls as any).age_range && (
                      <Badge variant="secondary" className="text-hec-caption">👥 Ages {(cls as any).age_range}</Badge>
                    )}
                  </div>

                  {/* Schedule */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-hec-small font-medium text-hec-ink">
                      <Calendar className="h-3.5 w-3.5 text-hec-ink-soft" />
                      Schedule
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {uniqueDays.map(day => (
                        <Badge key={day} variant="secondary" className="text-hec-caption">
                          {DAY_NAMES[day]}
                        </Badge>
                      ))}
                    </div>
                    {cls.slots.length > 0 && (
                      <div className="flex items-center gap-1.5 text-hec-caption tabular-nums text-hec-ink-soft">
                        <Clock className="h-3 w-3" />
                        {cls.slots[0].startTime?.slice(0, 5)} – {cls.slots[0].endTime?.slice(0, 5)}
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  {isPending ? (
                    <Button disabled className="min-h-hec-target w-full" variant="secondary" size="sm">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Request Pending
                    </Button>
                  ) : (
                    <Button
                      className="min-h-hec-target w-full"
                      size="sm"
                      onClick={() => setSelectedClass(cls)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Request to Join
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedClass} onOpenChange={() => { setSelectedClass(null); setMessage(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="whitespace-normal break-words">Join {selectedClass?.name}? 🚀</DialogTitle>
            <DialogDescription>
              Send a request to the admin. They'll review it and get back to you!
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Add a message (optional)..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={200}
            className="resize-none"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedClass(null); setMessage(""); }}>
              Cancel
            </Button>
            <Button
              onClick={() => requestMutation.mutate({ classId: selectedClass.id, msg: message })}
              disabled={requestMutation.isPending}
            >
              {requestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
