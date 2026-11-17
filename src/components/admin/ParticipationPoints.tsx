import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ParticipationPointsProps {
  session: any;
  students: any[];
  onClose: () => void;
}

export function ParticipationPoints({ session, students, onClose }: ParticipationPointsProps) {
  const [points, setPoints] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const updatePointsMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const month = new Date().toISOString().slice(0, 7);
      
      for (const [studentId, pointValue] of Object.entries(points)) {
        if (!pointValue) continue;
        
        const pointsInt = parseInt(pointValue);
        if (pointsInt < 0 || pointsInt > 20) {
          throw new Error(`Points for student must be between 0 and 20`);
        }

        // Create point transaction (trigger will update student_points automatically)
        const { error } = await supabase
          .from("point_transactions")
          .insert({
            student_id: studentId,
            class_id: session.class_id,
            session_id: session.id,
            points: pointsInt,
            type: 'participation',
            date: today,
            month,
            notes: 'Class participation points',
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-board"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-leader"] });
      queryClient.invalidateQueries({ queryKey: ["point-breakdown"] });
      queryClient.invalidateQueries({ queryKey: ["available-months"] });
      queryClient.invalidateQueries({ queryKey: ["point-transactions"] });
      toast.success("Participation points updated");
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update points");
    },
  });

  const handleSubmit = () => {
    updatePointsMutation.mutate();
  };

  return (
    <Dialog open={!!session} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Participation Points</DialogTitle>
          <DialogDescription>
            Award points for class participation (max 20 points per student per session)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {students?.map((student: any) => (
            <div key={student.id} className="flex items-center gap-4">
              <Label className="flex-1">{student.full_name}</Label>
              <Input
                type="number"
                min="0"
                max="20"
                placeholder="0-20"
                className="w-24"
                value={points[student.id] || ""}
                onChange={(e) => setPoints({ ...points, [student.id]: e.target.value })}
              />
            </div>
          ))}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={updatePointsMutation.isPending}
          className="w-full mt-4"
        >
          {updatePointsMutation.isPending ? "Saving..." : "Save Points"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
