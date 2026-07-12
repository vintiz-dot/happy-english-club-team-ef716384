import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHtml } from "@/lib/sanitize";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Star, CheckCircle2, Clock, Send, AlertTriangle, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import HomeworkDetailDialog from "@/components/student/HomeworkDetailDialog";
import HomeworkStreakCard from "@/components/student/HomeworkStreakCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignmentCalendar } from "@/components/assignments/AssignmentCalendar";
import { useLoginChallenge } from "@/hooks/useLoginChallenge";
import { GradeCelebration } from "@/components/student/GradeCelebration";
import { getHomeworkStatus, statusConfig, getCountdown, type HomeworkStatus } from "@/lib/homeworkStatus";
import { motion } from "framer-motion";
import { HomeworkPdfDownload } from "@/components/homework/HomeworkPdfDownload";
import { PageHero } from "@/components/quest/PageHero";
import { EmptyState } from "@/components/quest/EmptyState";
import { PagedListControls, usePagedList } from "@/components/shared/PagedListControls";

const statusIcons: Record<HomeworkStatus, React.ReactNode> = {
  overdue: <AlertTriangle className="h-4 w-4 text-red-500" />,
  "due-today": <Clock className="h-4 w-4 text-amber-500" />,
  "due-soon": <Clock className="h-4 w-4 text-amber-400" />,
  submitted: <Send className="h-4 w-4 text-sky-500" />,
  graded: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  upcoming: <FileText className="h-4 w-4 text-muted-foreground" />,
};

function SubmissionPipeline({ status }: { status: HomeworkStatus }) {
  const steps = ["To Do", "Submitted", "Graded"];
  const activeIdx = status === "graded" ? 2 : status === "submitted" ? 1 : 0;
  return (
    <div className="flex items-center gap-1 mt-1">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <motion.div
            className={`h-1.5 w-7 sm:w-6 rounded-full transition-colors ${i <= activeIdx ? "bg-emerald-500" : "bg-muted"}`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: i * 0.15, duration: 0.3 }}
          />
          {i < steps.length - 1 && <div className="h-px w-1 bg-muted" />}
        </div>
      ))}
      <span className="text-[11px] sm:text-xs ml-1 text-muted-foreground font-medium">{steps[activeIdx]}</span>
    </div>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.06,
      duration: 0.4,
      ease: "easeOut" as const,
    },
  }),
};

function AssignmentCard({ assignment, onClick, index = 0 }: { assignment: any; onClick: () => void; index?: number }) {
  const status = getHomeworkStatus(assignment);
  const config = statusConfig[status];
  const countdown = getCountdown(assignment.due_date);
  const isOverdue = status === "overdue";

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.015, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className={`cursor-pointer hover:shadow-md transition-shadow duration-200 min-w-0 overflow-hidden ${config.cardClass} ${config.borderColor} ${isOverdue ? "ring-1 ring-red-500/30 shadow-[0_0_0_1px_hsl(0_84%_60%/0.15)]" : ""}`}
        onClick={onClick}
      >
        <CardHeader className="p-3 sm:p-5 min-w-0 overflow-hidden">
          <div className="space-y-2 min-w-0">
            <div className="flex items-start gap-2 min-w-0">
              <span className="mt-0.5 shrink-0 relative">
                {statusIcons[status]}
                {isOverdue && (
                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
                )}
              </span>
              <div className="flex-1 min-w-0 overflow-hidden">
                <CardTitle className="text-base sm:text-lg leading-tight break-words [overflow-wrap:anywhere]">
                  {assignment.title}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-0.5 break-words">
                  {assignment.classes?.name || "Class"}
                </CardDescription>
              </div>
              {status === "graded" && assignment.submission?.grade && (
                <motion.div
                  className="shrink-0 flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/40 rounded-xl px-3 py-1.5"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, delay: 0.3 }}
                >
                  <Star className="h-4 w-4 text-emerald-500 fill-emerald-500" />
                  <span className="font-bold text-base text-emerald-700 dark:text-emerald-400">
                    {assignment.submission.grade}
                  </span>
                </motion.div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <Badge className={`text-[11px] sm:text-xs px-2 py-0.5 ${config.badgeClass}`}>
                {config.icon} {config.label}
              </Badge>
              {countdown && (
                <Badge className={`text-[11px] sm:text-xs px-2 py-0.5 ${config.badgeClass} inline-flex items-center gap-1`}>
                  {isOverdue && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 animate-ping" style={{ animationDuration: "2.8s" }} />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                    </span>
                  )}
                  {countdown}
                </Badge>
              )}
              {assignment.due_date && (
                <Badge variant="outline" className="text-[11px] sm:text-xs px-2 py-0.5">
                  Due {new Date(assignment.due_date).toLocaleDateString()}
                </Badge>
              )}
            </div>

            {/* Prominent PDF download — its own row so it never gets pushed off-screen */}
            <div onClick={(e) => e.stopPropagation()} className="pt-1">
              <HomeworkPdfDownload
                homework={assignment}
                className={assignment.classes?.name || ""}
                variant="pill-compact"
              />
            </div>

            {(status === "submitted" || status === "graded") && (
              <SubmissionPipeline status={status} />
            )}
          </div>
        </CardHeader>
        {assignment.body && status !== "graded" && (
          <CardContent className="px-3 pb-3 sm:px-5 sm:pb-4 pt-0 min-w-0 overflow-hidden">
            <div
              className="text-sm prose prose-sm rich-content max-w-none w-full min-w-0 line-clamp-2 break-words [overflow-wrap:anywhere] overflow-hidden [&_*]:max-w-full [&_img]:max-w-full [&_img]:h-auto"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(assignment.body) }}
            />
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}

export default function StudentAssignments() {
  const { studentId } = useStudentProfile();
  const [selectedHomework, setSelectedHomework] = useState<any>(null);
  const { recordHomeworkVisit } = useLoginChallenge(studentId);

  useEffect(() => {
    if (studentId) recordHomeworkVisit();
  }, [studentId]);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["student-assignments", studentId],
    queryFn: async () => {
      if (!studentId) return [];

      // Use RPC to bypass RLS — the function does its own auth check
      const { data, error } = await supabase.rpc("get_student_homeworks", {
        p_student_id: studentId,
      });

      if (error) {
        console.error("get_student_homeworks RPC error:", error);
        return [];
      }

      const result = data as any;
      const homeworks: any[] = result?.homeworks || [];
      const submissions: any[] = result?.submissions || [];
      const submissionMap = new Map(submissions.map((s: any) => [s.homework_id, s]));
      return homeworks.map((hw: any) => ({ ...hw, submission: submissionMap.get(hw.id) || null }));
    },
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
  });

  const now = new Date();
  const upcomingAssignments = assignments.filter((a: any) => !a.due_date || new Date(a.due_date) >= now);
  const pastAssignments = assignments.filter((a: any) => a.due_date && new Date(a.due_date) < now);

  // Paginate each list independently. Upcoming is usually short; past
  // grows over the year. Both honour the 20-per-page rule.
  // CRITICAL: These must be above any conditional returns to avoid React Error #310
  const upcomingPaged = usePagedList(upcomingAssignments);
  const pastPaged = usePagedList(pastAssignments);
  const upcomingSoonPaged = usePagedList(upcomingAssignments);

  if (!studentId) {
    return (
      <Layout title="Assignments">
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Please select a student profile</p></CardContent></Card>
      </Layout>
    );
  }

  if (isLoading) return <Layout title="Assignments">Loading...</Layout>;

  return (
    <Layout title="Assignments">
      {studentId && assignments.length > 0 && <GradeCelebration studentId={studentId} assignments={assignments} />}
      <div className="space-y-4 sm:space-y-6 no-x-overflow min-w-0">
        <PageHero
          eyebrow="Quest log"
          title="Assignments"
          subtitle="Track your homework, earn XP, level up."
          variant="aurora"
        />

        {/* Homework Streak Tracker */}
        {assignments.length > 0 && studentId && (
          <HomeworkStreakCard studentId={studentId} assignments={assignments} />
        )}

        {assignments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No assignments yet"
            description="Your teachers haven't posted any assignments. Check back soon — new quests appear here."
          />
        ) : (
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-auto rounded-xl bg-muted/60 p-1">
              <TabsTrigger value="list" className="text-sm py-2.5 min-h-[44px] rounded-lg font-semibold">📋 List</TabsTrigger>
              <TabsTrigger value="calendar" className="text-sm py-2.5 min-h-[44px] rounded-lg font-semibold">📅 Calendar</TabsTrigger>
              <TabsTrigger value="upcoming" className="text-sm py-2.5 min-h-[44px] rounded-lg font-semibold">🔜 Soon</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-6 mt-4">
              {upcomingAssignments.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold flex items-center gap-2">🎯 Current & Upcoming</h2>
                  <div className="grid gap-3">
                    {upcomingPaged.slice.map((a: any, i: number) => (
                      <div key={a.id} className="long-list-item">
                        <AssignmentCard assignment={a} index={i} onClick={() => setSelectedHomework(a)} />
                      </div>
                    ))}
                  </div>
                  <PagedListControls
                    page={upcomingPaged.page}
                    totalPages={upcomingPaged.totalPages}
                    total={upcomingPaged.total}
                    rangeLabel={upcomingPaged.rangeLabel}
                    onPageChange={upcomingPaged.setPage}
                  />
                </div>
              )}
              {pastAssignments.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold flex items-center gap-2">📁 Past Assignments</h2>
                  <div className="grid gap-3">
                    {pastPaged.slice.map((a: any, i: number) => {
                      const st = getHomeworkStatus(a);
                      const isOverdueNotSubmitted = st === "overdue";
                      return (
                        <div key={a.id} className={`long-list-item ${isOverdueNotSubmitted ? "" : "opacity-60 hover:opacity-90 transition-opacity"}`}>
                          <AssignmentCard assignment={a} index={i} onClick={() => setSelectedHomework(a)} />
                        </div>
                      );
                    })}
                  </div>
                  <PagedListControls
                    page={pastPaged.page}
                    totalPages={pastPaged.totalPages}
                    total={pastPaged.total}
                    rangeLabel={pastPaged.rangeLabel}
                    onPageChange={pastPaged.setPage}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="calendar" className="mt-4">
              <AssignmentCalendar
                role="student"
                onSelectAssignment={(assignment) => {
                  const hw = assignments.find((h: any) => h.id === assignment.id);
                  if (hw) setSelectedHomework(hw);
                }}
              />
            </TabsContent>

            <TabsContent value="upcoming" className="mt-4 space-y-4">
              {upcomingAssignments.length === 0 ? (
                <Card><CardContent className="py-12 text-center"><FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No upcoming assignments</p></CardContent></Card>
              ) : (
                <>
                  <div className="grid gap-3">
                    {upcomingSoonPaged.slice.map((a: any, i: number) => (
                      <AssignmentCard key={a.id} assignment={a} index={i} onClick={() => setSelectedHomework(a)} />
                    ))}
                  </div>
                  <PagedListControls
                    page={upcomingSoonPaged.page}
                    totalPages={upcomingSoonPaged.totalPages}
                    total={upcomingSoonPaged.total}
                    rangeLabel={upcomingSoonPaged.rangeLabel}
                    onPageChange={upcomingSoonPaged.setPage}
                  />
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {selectedHomework && studentId && (
        <HomeworkDetailDialog homework={selectedHomework} studentId={studentId} onClose={() => setSelectedHomework(null)} />
      )}
    </Layout>
  );
}
