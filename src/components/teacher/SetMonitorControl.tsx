import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SetMonitorDialogProps {
  classId: string;
  roster: Array<{ id: string; full_name: string }>;
}

export function SetMonitorControl({ classId, roster }: SetMonitorDialogProps) {
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState<string>("");

  const { data: currentMonitor, isLoading } = useQuery({
    queryKey: ["class-monitor", classId],
    queryFn: async () => {
      const { data } = await supabase
        .from("class_monitors")
        .select("id, student_id, students:student_id(full_name)")
        .eq("class_id", classId)
        .maybeSingle();
      return data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (studentId: string) => {
      // Upsert - replace existing monitor
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

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Shield className="h-4 w-4 text-warning" />
        <span>Class Monitor</span>
      </div>

      {currentMonitor ? (
        <div className="flex items-center justify-between">
          <Badge className="bg-warning/20 text-warning border-warning/30">
            🛡️ {monitorName || "Unknown"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeMutation.mutate()}
            disabled={removeMutation.isPending}
          >
            <X className="h-4 w-4 mr-1" /> Remove
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No monitor assigned</p>
      )}

      <div className="flex gap-2">
        <Select value={selectedStudent} onValueChange={setSelectedStudent}>
          <SelectTrigger className="flex-1 h-9 text-sm" aria-label="Class Monitor">
            <SelectValue placeholder="Select student..." />
          </SelectTrigger>
          <SelectContent>
            {roster.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          disabled={!selectedStudent || assignMutation.isPending}
          onClick={() => selectedStudent && assignMutation.mutate(selectedStudent)}
        >
          Assign
        </Button>
      </div>
    </div>
  );
}
