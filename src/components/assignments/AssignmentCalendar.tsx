import { useMemo, useState, useContext, useEffect, useRef } from "react";
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
import { Loading } from "@/components/ui/loading";

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
  const lastDateRef = useRef<string | null>(null);
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
          <CalendarIcon className="h-12 w-12 mx-auto text-hec-ink-soft mb-4" />
          <p className="text-hec-ink-soft">No assignments for this month</p>
          <p className="text-hec-small text-hec-ink-soft mt-1">
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
        return "bg-hec-leaf";
      case "late":
        return "bg-hec-danger";
      case "due-today":
        return "bg-hec-warn";
      case "submitted":
      case "has-submissions":
        return "bg-hec-ink";
      default:
        return "bg-hec-ink-faint";
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

  // Keep showing the last day while the list animates closed, so it does not blank out mid-fade.
  if (selectedDate) lastDateRef.current = selectedDate;
  const shownDate = selectedDate ?? lastDateRef.current;
  const selectedDateAssignments = shownDate ? assignmentsByDate[shownDate] || [] : [];

  return (
    <Card className="p-4 md:p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarIcon className="h-5 w-5 shrink-0 text-hec-ink-soft" />
            <h2 className="whitespace-nowrap text-base font-semibold sm:text-lg">
              <span className="sm:hidden">{dayjs(currentMonth).format("MMM YYYY")}</span>
              <span className="hidden sm:inline">{dayjs(currentMonth).format("MMMM YYYY")}</span>
            </h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth("prev")}
              aria-label="Previous month"
              className="min-h-hec-target min-w-hec-target p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="min-h-hec-target px-3"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth("next")}
              aria-label="Next month"
              className="min-h-hec-target min-w-hec-target p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-2 text-hec-caption text-hec-ink-soft">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-hec-leaf" />
            <span>{role === "student" ? "Graded" : "All Graded"}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-hec-ink" />
            <span>{role === "student" ? "Submitted" : "Has Submissions"}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-hec-warn" />
            <span>Due Today</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-hec-danger" />
            <span>Late</span>
          </div>
        </div>

        {/* Calendar Grid */}
        {isLoading ? (
          <Loading message="Loading calendar" />
        ) : (
          <>
            <div className="-mx-2 grid grid-cols-7 gap-0.5 text-hec-caption font-medium text-hec-ink-soft sm:mx-0 sm:gap-1">
              {weekdayHeaders.map((h) => (
                <div key={h} className="px-2 py-1 text-center">
                  {h}
                </div>
              ))}
            </div>
            {/* Ivory at 375: the grid borrows the card padding and a 2 px gap so seven columns keep 44 px targets (R08). */}
            <div className="-mx-2 grid grid-cols-7 gap-0.5 sm:mx-0 sm:gap-2">
              {cells.map((d) => {
                const dayAssignments = assignmentsByDate[d] || [];
                const isCurrentMonth = d.startsWith(currentMonth);
                
                return (
                  <button
                    key={d}
                    onClick={() => dayAssignments.length > 0 && setSelectedDate(d)}
                    className={
                      `relative min-h-16 rounded-hec-md border p-1 sm:min-h-[80px] sm:p-2 transition-colors duration-hec-1 ease-hec focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring ${
                            isToday(d) ? "border-hec-ink bg-hec-surface ring-1 ring-hec-ink" : isCurrentMonth ? "border-hec-line bg-hec-surface" : "border-hec-line bg-hec-paper"
                          } ${dayAssignments.length > 0 ? "cursor-pointer hover:bg-hec-sunken" : "cursor-default"}`
                    }
                  >
                    <div className="text-right mb-1">
                      <div className="text-hec-small font-medium tabular-nums text-hec-ink">
                        {dayjs(d).format("D")}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 mt-2">
                      {dayAssignments.slice(0, 3).map((assignment) => (
                        <div
                          key={assignment.id}
                          className={`h-2.5 rounded-full ${getStatusColor(
                            getAssignmentStatus(assignment)
                          )} ${""}`}
                          title={assignment.title}
                        />
                      ))}
                      {dayAssignments.length > 3 && (
                        <div className="text-center text-hec-caption font-medium text-hec-ink mt-0.5">
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
        <DialogContent className="w-[calc(100%-2rem)] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="pr-8 text-left leading-snug">
              Assignments for {shownDate && dayjs(shownDate).format("MMMM D, YYYY")}
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
                    className="cursor-pointer p-4 transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken"
                    onClick={() => {
                      // Close this list first, or the homework opens underneath it.
                      setSelectedDate(null);
                      onSelectAssignment?.(assignment);
                    }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold break-words">{assignment.title}</h3>
                          <p className="text-hec-small text-hec-ink-soft">
                            {assignment.classes?.name || "No class"}
                          </p>
                        </div>
                        <Badge className="shrink-0"
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
                        <div className="text-hec-caption text-hec-ink-soft">
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
