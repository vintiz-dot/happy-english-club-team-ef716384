import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { unlockHeaders } from "@/lib/adminUnlock";
import { Loader2, RotateCcw, Calendar } from "lucide-react";
import { monthKey } from "@/lib/date";
import { useQuery } from "@tanstack/react-query";

export function PointsResetControl() {
  const [targetMonth, setTargetMonth] = useState(monthKey());
  const [resetScope, setResetScope] = useState<"all" | "class" | "student">("all");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  // Fetch classes
  const { data: classes } = useQuery({
    queryKey: ["classes"],
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

  // Fetch students
  const { data: students } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-points", {
        body: { 
          targetMonth, 
          scope: resetScope,
          classId: resetScope === "class" ? selectedClassId : undefined,
          studentId: resetScope === "student" ? selectedStudentId : undefined,
        },
        // Proof that this browser passed the sign-in gate. The function
        // refuses without it, so the gate is enforced here rather than
        // merely drawn over the page.
        headers: unlockHeaders(),
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Reset ${data.reset} point records for ${targetMonth}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const getScopeDescription = () => {
    if (resetScope === "class" && selectedClassId) {
      const cls = classes?.find(c => c.id === selectedClassId);
      return `all students in ${cls?.name}`;
    }
    if (resetScope === "student" && selectedStudentId) {
      const student = students?.find(s => s.id === selectedStudentId);
      return student?.full_name;
    }
    return "all students in all classes";
  };

  const isValid = 
    resetScope === "all" ||
    (resetScope === "class" && selectedClassId) ||
    (resetScope === "student" && selectedStudentId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5" />
          Reset Points
        </CardTitle>
        <CardDescription>
          Reset points for specific students, classes, or all students for a given month.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="target-month" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Target Month (YYYY-MM)
          </Label>
          <Input
            id="target-month"
            type="month"
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
            max={monthKey()}
          />
        </div>

        <div className="space-y-2">
          <Label>Reset Scope</Label>
          <Select value={resetScope} onValueChange={(value: any) => setResetScope(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students (All Classes)</SelectItem>
              <SelectItem value="class">Specific Class</SelectItem>
              <SelectItem value="student">Specific Student</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {resetScope === "class" && (
          <div className="space-y-2">
            <Label>Select Class</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a class" />
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
        )}

        {resetScope === "student" && (
          <div className="space-y-2">
            <Label>Select Student</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a student" />
              </SelectTrigger>
              <SelectContent>
                {students?.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              className="w-full" 
              disabled={isResetting || !isValid}
            >
              {isResetting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Reset Points for {targetMonth}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Points?</AlertDialogTitle>
              <AlertDialogDescription>
                This will:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Delete all point transactions for {getScopeDescription()}</li>
                  <li>Reset student_points records to 0 for {targetMonth}</li>
                  <li>This action cannot be undone!</li>
                </ul>
                <p className="mt-3 font-semibold text-destructive">
                  Warning: This permanently deletes point history!
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Confirm Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="bg-muted/50 p-3 rounded-lg text-sm">
          <p className="font-medium mb-1">⚠️ Important</p>
          <p className="text-muted-foreground">
            This is different from the monthly archive/reset. Use this for corrections or testing only. 
            For normal monthly resets, use the Leaderboard Reset function which preserves history.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
