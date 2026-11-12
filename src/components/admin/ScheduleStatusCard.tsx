import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TeacherReport {
  teacher_id: string | null;
  teacher_name: string;
  scheduled_minutes: number;
  held_minutes: number;
  sessions: Array<{
    id: string;
    class_id: string;
    class_name: string;
    date: string;
    start_time: string;
    end_time: string;
    status: string;
  }>;
}

interface ScheduleReport {
  success: boolean;
  month: string;
  normalized: number;
  created: number[];
  skippedConflicts: any[];
  attention: {
    noTeacherExpected: any[];
    noTeacherExisting: any[];
  };
  perTeacher: TeacherReport[];
}

export function ScheduleStatusCard({ month }: { month?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: report, refetch, isLoading } = useQuery({
    queryKey: ['schedule-status', month],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('schedule-sessions', {
        body: { month },
      });
      if (error) throw error;
      return data as ScheduleReport;
    },
    enabled: false, // Only fetch when explicitly triggered
  });

  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Status
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Check Status
          </Button>
        </div>
      </CardHeader>
      
      {report && (
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Badge variant={report.success ? "success" : "destructive"}>
              {report.success ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Success
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Failed
                </>
              )}
            </Badge>
            <span className="text-hec-small tabular-nums text-hec-ink-soft">
              Month: {report.month}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="font-sans text-hec-h1 font-semibold tabular-nums text-hec-ink">{report.created?.length || 0}</div>
              <div className="text-hec-caption text-hec-ink-soft">Created</div>
            </div>
            <div>
              <div className="font-sans text-hec-h1 font-semibold tabular-nums text-hec-ink">{report.normalized || 0}</div>
              <div className="text-hec-caption text-hec-ink-soft">Normalized</div>
            </div>
            <div>
              <div className="font-sans text-hec-h1 font-semibold tabular-nums text-hec-ink">{report.skippedConflicts?.length || 0}</div>
              <div className="text-hec-caption text-hec-ink-soft">Conflicts</div>
            </div>
            <div>
              <div className="font-sans text-hec-h1 font-semibold tabular-nums text-hec-ink">
                {(report.attention?.noTeacherExpected?.length || 0) + 
                 (report.attention?.noTeacherExisting?.length || 0)}
              </div>
              <div className="text-hec-caption text-hec-ink-soft">Attention Needed</div>
            </div>
          </div>

          {report.perTeacher && report.perTeacher.length > 0 && (
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Teacher Schedule ({report.perTeacher.length})
                  </span>
                  <span className="text-hec-small text-hec-ink-soft">
                    {isOpen ? 'Hide' : 'Show'} details
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-3">
                {report.perTeacher.map((teacher) => (
                  <div key={teacher.teacher_id || 'unassigned'} className="rounded-hec-md border border-hec-line bg-hec-surface p-4">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0 whitespace-normal break-words text-hec-body font-medium text-hec-ink">{teacher.teacher_name}</div>
                      <Badge variant="secondary" className="shrink-0 tabular-nums">{teacher.sessions.length} sessions</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-hec-small text-hec-ink">
                      <div>
                        <span className="text-hec-ink-soft">Scheduled:</span>{' '}
                        <span className="font-medium tabular-nums">{formatHours(teacher.scheduled_minutes)}</span>
                      </div>
                      <div>
                        <span className="text-hec-ink-soft">Held:</span>{' '}
                        <span className="font-medium tabular-nums">{formatHours(teacher.held_minutes)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {report.attention && (
            (report.attention.noTeacherExpected?.length > 0 || 
             report.attention.noTeacherExisting?.length > 0) && (
              <div className="rounded-hec-md border border-hec-warn/30 bg-hec-warn-tint p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-hec-warn" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 font-medium text-hec-warn">
                      Attention Required
                    </div>
                    {report.attention.noTeacherExpected?.length > 0 && (
                      <div className="text-hec-small text-hec-ink">
                        {report.attention.noTeacherExpected.length} template slots have no teacher assigned
                      </div>
                    )}
                    {report.attention.noTeacherExisting?.length > 0 && (
                      <div className="text-hec-small text-hec-ink">
                        {report.attention.noTeacherExisting.length} existing sessions need teacher assignment
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </CardContent>
      )}

      {!report && !isLoading && (
        <CardContent>
          <p className="py-4 text-center text-hec-small text-hec-ink-soft">
            Click "Check Status" to view the current schedule state
          </p>
        </CardContent>
      )}
    </Card>
  );
}
