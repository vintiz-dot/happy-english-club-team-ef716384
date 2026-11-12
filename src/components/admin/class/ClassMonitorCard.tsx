import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Crown, X, UserCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ClassMonitorCardProps {
  classId: string;
}

export function ClassMonitorCard({ classId }: ClassMonitorCardProps) {
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState("");

  // Fetch enrolled students
  const { data: enrolledStudents, isLoading: loadingStudents } = useQuery({
    queryKey: ["class-enrolled-students", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("student_id, students:student_id(id, full_name, avatar_url)")
        .eq("class_id", classId)
        .is("end_date", null);
      if (error) throw error;
      return data?.map((e: any) => e.students).filter(Boolean) || [];
    },
  });

  // Fetch current monitor
  const { data: currentMonitor, isLoading: loadingMonitor } = useQuery({
    queryKey: ["class-monitor", classId],
    queryFn: async () => {
      const { data } = await supabase
        .from("class_monitors")
        .select("id, student_id, assigned_at, students:student_id(full_name, avatar_url)")
        .eq("class_id", classId)
        .maybeSingle();
      return data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (studentId: string) => {
      if (currentMonitor) {
        const { error } = await supabase
          .from("class_monitors")
          .update({ student_id: studentId, assigned_at: new Date().toISOString() })
          .eq("class_id", classId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("class_monitors")
          .insert({ class_id: classId, student_id: studentId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-monitor", classId] });
      toast.success("Class monitor assigned!");
      setSelectedStudent("");
    },
    onError: () => toast.error("Failed to assign monitor"),
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("class_monitors")
        .delete()
        .eq("class_id", classId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-monitor", classId] });
      toast.success("Monitor removed");
    },
    onError: () => toast.error("Failed to remove monitor"),
  });

  const monitorName = (currentMonitor as any)?.students?.full_name;
  const isLoading = loadingStudents || loadingMonitor;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <div className="shrink-0 rounded-hec-md bg-hec-sunken p-2">
            <Shield className="h-5 w-5 text-hec-brass" />
          </div>
          <div className="min-w-0">
            <span className="text-hec-ink">Class Monitor</span>
            <p className="mt-1 font-sans text-hec-caption font-normal text-hec-ink-soft">
              Designate a student as class leader
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-hec-md" />
            <Skeleton className="h-11 w-full rounded-hec-md" />
          </div>
        ) : (
          <>
            {/* Current Monitor Display */}
            <AnimatePresence mode="wait">
              {currentMonitor ? (
                <motion.div
                  key="monitor"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-start gap-3 rounded-hec-md border border-hec-brass/40 bg-hec-surface p-3"
                >
                  <div className="relative shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-hec-sunken">
                      <Crown className="h-5 w-5 text-hec-brass" />
                    </div>
                    <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-hec-brass" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1 self-center">
                    <p className="whitespace-normal break-words hyphens-none text-hec-small font-semibold text-hec-ink">
                      🛡️ {monitorName || "Unknown Student"}
                    </p>
                    <p className="text-hec-caption text-hec-ink-soft">Current Class Monitor</p>
                  </div>
                  <Button
                    variant="destructive-quiet"
                    size="sm"
                    onClick={() => removeMutation.mutate()}
                    disabled={removeMutation.isPending}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4 mr-1" /> Remove
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-hec-md border border-dashed border-hec-line bg-hec-sunken p-4 text-center"
                >
                  <UserCheck className="mx-auto mb-1 h-8 w-8 text-hec-ink-faint" aria-hidden="true" />
                  <p className="text-hec-caption text-hec-ink-soft">No monitor assigned yet</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Assignment controls */}
            <div className="flex gap-2">
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="min-w-0 flex-1" aria-label="Student to make class monitor">
                  <SelectValue placeholder="Select a student..." />
                </SelectTrigger>
                <SelectContent>
                  {(enrolledStudents || []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="shrink-0 gap-2"
                disabled={!selectedStudent || assignMutation.isPending}
                onClick={() => selectedStudent && assignMutation.mutate(selectedStudent)}
              >
                <Shield className="h-4 w-4" />
                {currentMonitor ? "Reassign" : "Assign"}
              </Button>
            </div>

            {enrolledStudents?.length === 0 && (
              <p className="text-center text-hec-caption text-hec-ink-soft">
                No students enrolled in this class yet.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
