import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SessionGeneratorConfirm } from "./SessionGeneratorConfirm";

interface GenerationReport {
  success: boolean;
  month: string;
  normalized: number;
  created: any[];
  updated: any[];
  removed: any[];
  skippedConflicts: any[];
  attention: {
    noTeacherExpected: any[];
    noTeacherExisting: any[];
    heldTimeRefused?: any[];
  };
  perTeacher: any[];
}

export function SessionGenerator({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<GenerationReport | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // D4 3A: always "future-only"; the include-held mode is retired from this screen.
  const handleGenerate = async (mode: "future-only") => {
    setShowConfirm(false);
    setIsGenerating(true);
    setReport(null);
    try {
      const { data, error } = await supabase.functions.invoke("schedule-sessions", {
        body: { month, mode },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.reason || data.error || 'Generation failed');
      }

      setReport(data);

      const summary = [
        `Created: ${data.created?.length || 0}`,
        `Updated: ${data.updated?.length || 0}`,
        `Removed: ${data.removed?.length || 0}`,
        `Normalized: ${data.normalized || 0}`,
      ].filter(Boolean).join(' • ');

      toast({
        title: "Schedule Generated",
        description: summary,
      });

      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Generate Monthly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="month">Select Month</Label>
            <Input
              id="month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <Button onClick={() => setShowConfirm(true)} disabled={isGenerating} className="w-full">
            {isGenerating ? "Generating schedule..." : "Generate Schedule"}
          </Button>
          
          <SessionGeneratorConfirm
            open={showConfirm}
            onClose={() => setShowConfirm(false)}
            onConfirm={handleGenerate}
            month={month}
          />
          <p className="text-sm text-muted-foreground">
            Idempotent schedule generation. Creates missing sessions from class templates,
            preserves existing assignments, and normalizes invalid future states.
            Running multiple times produces the same result.
          </p>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Generation Report for {report.month}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-2xl font-bold">{report.created.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Updated</p>
                <p className="text-2xl font-bold">{report.updated.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Removed</p>
                <p className="text-2xl font-bold">{report.removed.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Normalized</p>
                <p className="text-2xl font-bold">{report.normalized}</p>
              </div>
            </div>

            {report.skippedConflicts && report.skippedConflicts.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Skipped Conflicts ({report.skippedConflicts.length})</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1">
                    {report.skippedConflicts.map((conflict: any, idx: number) => (
                      <div key={idx} className="text-sm">
                        <strong>{conflict.class}</strong> on {conflict.date} at {conflict.time}: {conflict.reason}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {report.attention && (
              <>
                {report.attention.noTeacherExpected && report.attention.noTeacherExpected.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Sessions Skipped - No Teacher Assigned ({report.attention.noTeacherExpected.length})</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 space-y-1">
                        {report.attention.noTeacherExpected.map((session: any, idx: number) => (
                          <div key={idx} className="text-sm">
                            <strong>{session.className}</strong> on {session.date} at {session.startTime}–{session.endTime}
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {report.attention.noTeacherExisting && report.attention.noTeacherExisting.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Existing Sessions Without Teacher ({report.attention.noTeacherExisting.length})</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 space-y-1">
                        {report.attention.noTeacherExisting.map((session: any, idx: number) => (
                          <div key={idx} className="text-sm">
                            Session on {session.date} at {session.start_time}–{session.end_time}
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {report.perTeacher && report.perTeacher.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Per-Teacher Summary</h4>
                <div className="space-y-2">
                  {report.perTeacher.map((teacher: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded-lg">
                      <div>
                        <p className="font-medium">{teacher.teacher_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {teacher.sessions.length} sessions • {Math.round(teacher.scheduled_minutes / 60 * 10) / 10}h scheduled
                        </p>
                      </div>
                      <Badge variant={teacher.held_minutes > 0 ? "default" : "secondary"}>
                        {Math.round(teacher.held_minutes / 60 * 10) / 10}h held
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
