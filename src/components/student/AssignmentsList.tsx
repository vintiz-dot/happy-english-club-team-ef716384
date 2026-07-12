import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHtml } from "@/lib/sanitize";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import HomeworkSubmission from "./HomeworkSubmission";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AssignmentsListProps {
  studentId: string;
}

export default function AssignmentsList({ studentId }: AssignmentsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["student-assignments", studentId],
    queryFn: async () => {
      // Use RPC to bypass RLS
      const { data, error } = await supabase.rpc("get_student_homeworks", {
        p_student_id: studentId,
      });

      if (error) {
        console.error("AssignmentsList RPC error:", error);
        return [];
      }

      const result = data as any;
      const homeworks: any[] = result?.homeworks || [];
      const submissions: any[] = result?.submissions || [];
      const submissionMap = new Map(submissions.map((s: any) => [s.homework_id, s]));
      return homeworks.map((hw: any) => ({ ...hw, submission: submissionMap.get(hw.id) || null }));
    },
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return <div>Loading assignments...</div>;
  }

  if (!assignments || assignments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">No assignments yet</p>
        </CardContent>
      </Card>
    );
  }

  const getCardStatusClass = (assignment: any) => {
    const now = new Date();
    const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
    const submission = assignment.submission;
    
    if (submission?.status === "graded") {
      return "bg-emerald-500/15 dark:bg-emerald-500/10 border-l-4 border-l-emerald-500 border-emerald-500/30";
    }
    if (submission?.status === "submitted") {
      return "bg-sky-500/15 dark:bg-sky-500/10 border-l-4 border-l-sky-400 border-sky-400/30";
    }
    if (dueDate) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      const diffDays = Math.ceil((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return "bg-red-500/20 dark:bg-red-500/15 border-l-4 border-l-red-500 border-red-500/40";
      if (diffDays === 0) return "bg-amber-500/20 dark:bg-amber-500/15 border-l-4 border-l-amber-500 border-amber-500/40";
      if (diffDays <= 2) return "bg-amber-400/10 dark:bg-amber-400/10 border-l-4 border-l-amber-400 border-amber-400/30";
    }
    return "border-l-4 border-l-muted-foreground/20";
  };

  return (
    <div className="space-y-4">
      {assignments?.map((assignment) => {
        const cardClass = getCardStatusClass(assignment);
        
        return (
          <Collapsible
            key={assignment.id}
            open={expandedId === assignment.id}
            onOpenChange={() => setExpandedId(expandedId === assignment.id ? null : assignment.id)}
          >
            <Card className={cardClass}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-lg">{assignment.title}</CardTitle>
                  <CardDescription>{(assignment.classes as any)?.name}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {assignment.submission?.status === "graded" && assignment.submission.grade && (
                    <Badge variant="default" className="bg-emerald-600">
                      {assignment.submission.grade}
                    </Badge>
                  )}
                  {assignment.submission && (
                    <Badge variant={assignment.submission.status === "graded" ? "default" : "secondary"}>
                      {assignment.submission.status}
                    </Badge>
                  )}
                  <Badge variant={assignment.due_date && new Date(assignment.due_date) < new Date() ? "destructive" : "secondary"}>
                    {assignment.due_date ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due {format(new Date(assignment.due_date), "MMM d, yyyy")}
                      </span>
                    ) : (
                      "No due date"
                    )}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignment.body && (
                <div 
                  className="text-sm text-muted-foreground prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(assignment.body) }}
                />
              )}
              
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  {expandedId === assignment.id ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Hide Submission
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      {assignment.submission ? "View Submission" : "Submit Homework"}
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <HomeworkSubmission
                  homeworkId={assignment.id}
                  studentId={studentId}
                  existingSubmission={assignment.submission}
                />
              </CollapsibleContent>
            </CardContent>
          </Card>
        </Collapsible>
        );
      })}
    </div>
  );
}
