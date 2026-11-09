import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, ChevronDown } from "lucide-react";
import HomeworkDetailDialog from "@/components/student/HomeworkDetailDialog";
import HomeworkStreakCard from "@/components/student/HomeworkStreakCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignmentCalendar } from "@/components/assignments/AssignmentCalendar";
import { useLoginChallenge } from "@/hooks/useLoginChallenge";
import { GradeCelebration } from "@/components/student/GradeCelebration";
import { getHomeworkStatus } from "@/lib/homeworkStatus";
import { dayjs } from "@/lib/date";
import { PageHero } from "@/components/quest/PageHero";
import { PlaceholderCard } from "@/components/ui/loading";
import { EmptyState } from "@/components/quest/EmptyState";
import { PagedListControls, usePagedList } from "@/components/shared/PagedListControls";
import { HomeworkCard } from "@/components/student/homework/HomeworkCard";
import { cn } from "@/lib/utils";

/** Late homework older than this folds away, so a long-ago miss doesn't bury this week's work. */
const OLD_MISS_DAYS = 30;

const dueTime = (a: any) => (a.due_date ? dayjs(a.due_date).valueOf() : Number.POSITIVE_INFINITY);

function Section({ emoji, title, count, children }: { emoji: string; title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 px-1 text-lg font-black tracking-tight">
        <span aria-hidden>{emoji}</span>
        {title}
        {count !== undefined && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-extrabold text-muted-foreground">{count}</span>
        )}
      </h2>
      {children}
    </section>
  );
}

function PagedCards({ paged, onOpen }: { paged: ReturnType<typeof usePagedList<any>>; onOpen: (a: any) => void }) {
  return (
    <>
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        {paged.slice.map((a: any, i: number) => (
          <div key={a.id} className="long-list-item min-w-0">
            <HomeworkCard homework={a} index={i} onOpen={() => onOpen(a)} />
          </div>
        ))}
      </div>
      <PagedListControls
        page={paged.page}
        totalPages={paged.totalPages}
        total={paged.total}
        rangeLabel={paged.rangeLabel}
        onPageChange={paged.setPage}
      />
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/15 px-3 py-2 text-center ring-1 ring-white/20 backdrop-blur-sm">
      <p className="text-2xl font-black leading-none tabular-nums">{value}</p>
      <p className="mt-1 truncate text-[0.7rem] font-bold uppercase tracking-wide text-white/80">{label}</p>
    </div>
  );
}

export default function StudentAssignments() {
  const { studentId } = useStudentProfile();
  const [selectedHomework, setSelectedHomework] = useState<any>(null);
  const [showOldMisses, setShowOldMisses] = useState(false);
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

  // Group by what the student has to DO, not by date: anything not yet sent
  // is "to do" (late first), anything sent or marked is "done".
  const groups = useMemo(() => {
    const oldCutoff = dayjs().startOf("day").subtract(OLD_MISS_DAYS, "day").valueOf();
    const late: any[] = [];
    const oldMisses: any[] = [];
    const next: any[] = [];
    const done: any[] = [];
    for (const a of assignments as any[]) {
      const st = getHomeworkStatus(a);
      if (st === "submitted" || st === "graded") done.push(a);
      else if (st === "overdue") (dueTime(a) < oldCutoff ? oldMisses : late).push(a);
      else next.push(a);
    }
    late.sort((a, b) => dueTime(b) - dueTime(a));
    oldMisses.sort((a, b) => dueTime(b) - dueTime(a));
    next.sort((a, b) => dueTime(a) - dueTime(b));
    done.sort((a, b) => {
      const ta = a.submission?.graded_at || a.submission?.submitted_at || a.due_date || "";
      const tb = b.submission?.graded_at || b.submission?.submitted_at || b.due_date || "";
      return tb.localeCompare(ta);
    });
    return { late, oldMisses, next, done };
  }, [assignments]);

  const todoCount = groups.late.length + groups.next.length;

  // CRITICAL: hooks above any conditional return (React Error #310)
  const latePaged = usePagedList(groups.late);
  const nextPaged = usePagedList(groups.next);
  const oldPaged = usePagedList(groups.oldMisses);
  const donePaged = usePagedList(groups.done);

  if (!studentId) {
    return (
      <Layout title="Homework">
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Please select a student profile</p></CardContent></Card>
      </Layout>
    );
  }

  const hero = (
    <PageHero
      eyebrow="My homework"
      title={todoCount === 0 && !isLoading ? "All done! 🎉" : "Let's do this! 💪"}
      subtitle={
        isLoading
          ? "Finding your homework…"
          : todoCount === 0
            ? "You have nothing to do right now. Great job!"
            : `You have ${todoCount} ${todoCount === 1 ? "thing" : "things"} to do.`
      }
      variant="aurora"
    >
      {!isLoading && assignments.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat value={todoCount} label="To do" />
          <Stat value={groups.late.length} label="Late" />
          <Stat value={groups.done.length} label="Done" />
        </div>
      )}
    </PageHero>
  );

  if (isLoading) {
    return (
      <Layout title="Homework">
        <div className="space-y-4 sm:space-y-6 min-w-0">
          {hero}
          <PlaceholderCard rows={4} />
        </div>
      </Layout>
    );
  }

  const open = (a: any) => setSelectedHomework(a);

  return (
    <Layout title="Homework">
      {studentId && assignments.length > 0 && <GradeCelebration studentId={studentId} assignments={assignments} />}
      <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6 min-w-0">
        {hero}

        {assignments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No homework yet"
            description="Your teachers haven't set any homework. Check back soon!"
          />
        ) : (
          <Tabs defaultValue={todoCount > 0 ? "todo" : "done"} className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl bg-muted/70 p-1.5">
              {[
                { v: "todo", label: "To do", n: todoCount },
                { v: "done", label: "Done", n: groups.done.length },
                { v: "calendar", label: "Calendar" },
              ].map((t) => (
                <TabsTrigger
                  key={t.v}
                  value={t.v}
                  className="min-h-[44px] gap-1.5 rounded-xl px-1 text-[0.9375rem] font-extrabold data-[state=active]:shadow-[0_2px_0_0_hsl(var(--border))]"
                >
                  {t.label}
                  {t.n !== undefined && t.n > 0 && (
                    <span className="rounded-full bg-primary px-1.5 py-px text-[0.7rem] font-black leading-4 text-primary-foreground">
                      {t.n}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="todo" className="mt-5 space-y-7">
              {todoCount === 0 && (
                <div className="rounded-3xl border-2 border-b-[5px] border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-500/40 dark:bg-emerald-500/10">
                  <p className="text-5xl" aria-hidden>🏆</p>
                  <p className="mt-2 text-xl font-black">Nothing to do!</p>
                  <p className="mt-1 text-[0.9375rem] text-muted-foreground">You've sent all your homework. Amazing!</p>
                </div>
              )}
              {groups.late.length > 0 && (
                <Section emoji="⏰" title="Late — do these first" count={groups.late.length}>
                  <PagedCards paged={latePaged} onOpen={open} />
                </Section>
              )}
              {groups.next.length > 0 && (
                <Section emoji="🎯" title="Coming up" count={groups.next.length}>
                  <PagedCards paged={nextPaged} onOpen={open} />
                </Section>
              )}
              {groups.oldMisses.length > 0 && (
                <section className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowOldMisses((v) => !v)}
                    aria-expanded={showOldMisses}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-border px-4 py-3 text-left"
                  >
                    <span className="min-w-0 text-[0.9375rem] font-extrabold">
                      📦 Older homework you missed
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-extrabold text-muted-foreground">
                        {groups.oldMisses.length}
                      </span>
                    </span>
                    <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", showOldMisses && "rotate-180")} />
                  </button>
                  {showOldMisses && <PagedCards paged={oldPaged} onOpen={open} />}
                </section>
              )}
            </TabsContent>

            <TabsContent value="done" className="mt-5 space-y-4">
              {groups.done.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-border p-8 text-center">
                  <p className="text-4xl" aria-hidden>📬</p>
                  <p className="mt-2 text-lg font-black">Nothing sent yet</p>
                  <p className="mt-1 text-[0.9375rem] text-muted-foreground">Homework you send will appear here.</p>
                </div>
              ) : (
                <PagedCards paged={donePaged} onOpen={open} />
              )}
            </TabsContent>

            <TabsContent value="calendar" className="mt-5">
              <AssignmentCalendar
                role="student"
                onSelectAssignment={(assignment) => {
                  const hw = assignments.find((h: any) => h.id === assignment.id);
                  if (hw) setSelectedHomework(hw);
                }}
              />
            </TabsContent>
          </Tabs>
        )}

        {assignments.length > 0 && studentId && (
          <HomeworkStreakCard studentId={studentId} assignments={assignments} />
        )}
      </div>

      {selectedHomework && studentId && (
        <HomeworkDetailDialog homework={selectedHomework} studentId={studentId} onClose={() => setSelectedHomework(null)} />
      )}
    </Layout>
  );
}
