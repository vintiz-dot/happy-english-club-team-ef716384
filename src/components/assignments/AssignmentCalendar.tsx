import { useMemo, useState, useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildMonthGrid, todayKey, dayjs } from "@/lib/date";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StudentProfileContext } from "@/contexts/StudentProfileContext";

type Assignment = {
  id: string;
  title: string;
  due_date: string;
  class_id: string;
  classes: { name: string; id: string };
  homework_submissions?: Array<{
    id: string;
    status: string;
    student_id: string;
    submitted_at: string | null;
    graded_at: string | null;
  }>;
};

interface AssignmentCalendarProps {
  onSelectAssignment?: (assignment: Assignment) => void;
  role: "student" | "teacher" | "admin";
  classId?: string;
}

export function AssignmentCalendar({ onSelectAssignment, role, classId }: AssignmentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(dayjs().format("YYYY-MM"));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const context = useContext(StudentProfileContext);
  const studentId = context?.studentId;
  const isHydrated = context?.isHydrated;

  useEffect(() => {
    console.log("[AssignmentCalendar] studentId changed:", studentId);
  }, [studentId]);

  // Use the same logic as AssignmentsList - fetch enrollments, then homeworks with submissions
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["assignment-calendar", currentMonth, studentId, classId, role],
    queryFn: async () => {
      if (role === "student" && studentId) {
        // Use RPC to bypass RLS
        const { data, error } = await supabase.rpc("get_student_homeworks", {
          p_student_id: studentId,
        });

        if (error) {
          console.error("AssignmentCalendar RPC error:", error);
          return [];
        }

        const result = data as any;
        const homeworks: any[] = result?.homeworks || [];
        const submissions: any[] = result?.submissions || [];
        const submissionMap = new Map(submissions.map((s: any) => [s.homework_id, s]));

        return homeworks.map((hw: any) => ({
          ...hw,
          homework_submissions: submissionMap.has(hw.id) ? [submissionMap.get(hw.id)] : [],
        }));
      }
      
      return [];
    },
    enabled: (role !== "student" || (!!studentId && isHydrated)),
    staleTime: 0,
  });

  const cells = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);
  
  const assignmentsByDate = useMemo(() => {
    const map: Record<string, Assignment[]> = {};
    if (!assignments) return map;
    
    for (const assignment of assignments) {
      if (assignment.due_date) {
        (map[assignment.due_date] ||= []).push(assignment);
      }
    }
    return map;
  }, [assignments]);

  // Early return for empty state
  if (!isLoading && assignments.length === 0 && studentId && role === "student") {
    return (
      <Card>
        <div className="py-12 text-center px-4">
          <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No assignments for this month</p>
          <p className="text-sm text-muted-foreground mt-1">
            No assignments found for the selected student
          </p>
        </div>
      </Card>
    );
  }

  const getAssignmentStatus = (assignment: Assignment) => {
    const submissions = assignment.homework_submissions || [];
    const now = new Date();
    const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (role === "student") {
      const submission = submissions[0];
      
      if (submission?.status === "graded") return "graded";
      if (submission?.status === "submitted") return "submitted";
      
      if (!submission && dueDate) {
        const dueDay = new Date(dueDate);
        dueDay.setHours(0, 0, 0, 0);
        const daysDiff = Math.ceil((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 0) return "late";
        if (daysDiff === 0) return "due-today";
      }
      
      return "pending";
    }

    // For teacher/admin
    const gradedCount = submissions.filter(s => s.status === "graded").length;
    const submittedCount = submissions.filter(s => s.status === "submitted").length;
    const totalCount = submissions.length;

    if (gradedCount === totalCount && totalCount > 0) return "all-graded";
    if (submittedCount > 0) return "has-submissions";
    if (dueDate && dueDate < now) return "late";
    
    return "pending";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "graded":
      case "all-graded":
        return "bg-success";
      case "late":
        return "bg-destructive";
      case "due-today":
        return "bg-warning";
      case "submitted":
      case "has-submissions":
        return "bg-primary";
      default:
        return "bg-muted-foreground";
    }
  };

  const isToday = (d: string) => d === todayKey();
  const weekdayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const navigateMonth = (direction: "prev" | "next") => {
    const newMonth = dayjs(currentMonth)
      .add(direction === "next" ? 1 : -1, "month")
      .format("YYYY-MM");
    setCurrentMonth(newMonth);
  };

  const goToToday = () => {
    setCurrentMonth(dayjs().format("YYYY-MM"));
  };

  const selectedDateAssignments = selectedDate ? assignmentsByDate[selectedDate] || [] : [];

  return (
    <Card className="glass-sm p-4 md:p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {dayjs(currentMonth).format("MMMM YYYY")}
            </h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth("prev")}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="h-8 px-3"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth("next")}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span>{role === "student" ? "Graded" : "All Graded"}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>{role === "student" ? "Submitted" : "Has Submissions"}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <span>Due Today</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-destructive" />
            <span>Late</span>
          </div>
        </div>

        {/* Calendar Grid */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground font-medium">
              {weekdayHeaders.map((h) => (
                <div key={h} className="px-2 py-1 text-center">
                  {h}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {cells.map((d) => {
                const dayAssignments = assignmentsByDate[d] || [];
                const isCurrentMonth = d.startsWith(currentMonth);
                
                return (
                  <button
                    key={d}
                    onClick={() => dayAssignments.length > 0 && setSelectedDate(d)}
                    className={`glass-sm rounded-lg p-2 min-h-[80px] transition-all hover:scale-[1.02] relative ${
                      isToday(d) ? "ring-2 ring-primary" : ""
                    } ${!isCurrentMonth ? "opacity-40" : ""} ${
                      dayAssignments.length > 0 ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div className="text-right mb-1">
                      <div className={`text-sm font-medium ${isToday(d) ? "text-primary" : ""}`}>
                        {dayjs(d).format("D")}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 mt-2">
                      {dayAssignments.slice(0, 3).map((assignment) => (
                        <div
                          key={assignment.id}
                          className={`h-2.5 rounded-full ${getStatusColor(
                            getAssignmentStatus(assignment)
                          )} animate-fade-in shadow-sm`}
                          title={assignment.title}
                        />
                      ))}
                      {dayAssignments.length > 3 && (
                        <div className="text-[10px] text-center font-bold text-foreground mt-0.5">
                          +{dayAssignments.length - 3}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Assignment Details Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="glass-sm max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Assignments for {selectedDate && dayjs(selectedDate).format("MMMM D, YYYY")}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {selectedDateAssignments.map((assignment) => {
                const status = getAssignmentStatus(assignment);
                const submissions = assignment.homework_submissions || [];
                
                return (
                  <Card
                    key={assignment.id}
                    className="glass-sm p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => onSelectAssignment?.(assignment)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-semibold">{assignment.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {assignment.classes?.name || "No class"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            status === "graded" || status === "all-graded"
                              ? "default"
                              : status === "late"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {status === "graded"
                            ? "Graded"
                            : status === "all-graded"
                            ? "All Graded"
                            : status === "late"
                            ? "Late"
                            : status === "due-today"
                            ? "Due Today"
                            : status === "submitted"
                            ? "Submitted"
                            : status === "has-submissions"
                            ? `${submissions.filter(s => s.status === "submitted").length} Submissions`
                            : "Pending"}
                        </Badge>
                      </div>
                      {role !== "student" && submissions.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {submissions.filter(s => s.status === "graded").length} graded ·{" "}
                          {submissions.filter(s => s.status === "submitted").length} submitted
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
