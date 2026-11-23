/**
 * What the homework page draws (docs/EXPERIENCE_DESIGN_BRIEF.md G2 to G5, Phase 7 round 1). StudentAssignments keeps
 * every hook, query, group and page of the list; this only renders them, by the child's band. It sits inside
 * <Layout> so it can read the band (age decides form, never access: every band reaches the same tabs).
 *   early   Pip, one large card, the finish line; today's tabs behind a closed "Grown-ups" disclosure
 *   young   the page as it was, with the Vietnamese beneath the key labels; the finish line in the trophy's place
 *   junior  the same, the finish line, and a line about vocabulary cards only when a count is already in the cache
 *   teen    no emoji on the page; the finish line
 */
import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlaceholderCard } from "@/components/ui/loading";
import { PagedListControls, type usePagedList } from "@/components/shared/PagedListControls";
import { AssignmentCalendar } from "@/components/assignments/AssignmentCalendar";
import HomeworkDetailDialog from "@/components/student/HomeworkDetailDialog";
import HomeworkStreakCard from "@/components/student/HomeworkStreakCard";
import { GradeCelebration } from "@/components/student/GradeCelebration";
import { HomeworkCard } from "@/components/student/homework/HomeworkCard";
import { EarlyHomework } from "@/components/student/homework/EarlyHomework";
import { Bi } from "@/components/student/band/Bi";
import { FinishState } from "@/components/student/home/FinishState";
import { Arrive, ArriveItem } from "@/components/fx/Arrive";
import { useAuth } from "@/hooks/useAuth";
import { useAgeBand } from "@/hooks/useAgeBand";
import { useCopy } from "@/lib/copy/useCopy";
import type { StudentCopyKey } from "@/lib/copy/student";
import type { HomeworkGroups } from "@/lib/studentHomework";
import { cn } from "@/lib/utils";
import { BADGE_NEUTRAL, BUTTON, BUTTON_SECONDARY, CARD, CARD_TITLE, LABEL } from "@/components/student/nova/ivory";

type Paged = ReturnType<typeof usePagedList<any>>;

/** English first, the Vietnamese beneath when the band asks for it; an emoji only when the band may have one. */
function Label({ k, emoji, className }: { k: StudentCopyKey; emoji?: string | null; className?: string }) {
  const { en, vi, beneath } = useCopy();
  return (
    <span className={cn("inline-block min-w-0", className)}>
      <span>
        {emoji ? <span aria-hidden>{emoji} </span> : null}
        {en(k)}
      </span>
      {beneath && (
        <span lang="vi" className="block text-hec-small font-normal text-hec-ink-soft">{vi(k)}</span>
      )}
    </span>
  );
}

function Section({ emoji, k, count, children }: { emoji: string | null; k: StudentCopyKey; count?: number; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-start gap-2 px-1 font-display text-hec-h2 font-medium text-hec-ink">
        <Label k={k} emoji={emoji} />
        {count !== undefined && <span className={cn(BADGE_NEUTRAL, "mt-1")}>{count}</span>}
      </h2>
      {children}
    </section>
  );
}

/** `lead`: this list holds the first homework on the screen, which gets the one brass button (DS s.15). */
function PagedCards({ paged, onOpen, lead = false, plain }: { paged: Paged; onOpen: (a: any) => void; lead?: boolean; plain: boolean }) {
  return (
    <>
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        {paged.slice.map((a: any, i: number) => (
          <div key={a.id} className="long-list-item min-w-0">
            <HomeworkCard homework={a} index={lead && paged.page === 1 ? i : i + 1} onOpen={() => onOpen(a)} plain={plain} />
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

function Stat({ value, k }: { value: number; k: StudentCopyKey }) {
  return (
    <div className="min-w-0 rounded-hec-md border border-hec-line bg-hec-paper px-3 py-2 text-center">
      <p className="font-sans text-hec-h2 font-semibold leading-none tabular-nums text-hec-ink">{value}</p>
      <p className={cn(LABEL, "mt-1 whitespace-normal break-words")}>
        <Label k={k} />
      </p>
    </div>
  );
}

export interface HomeworkViewProps {
  studentId: string;
  assignments: any[];
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: () => void;
  groups: HomeworkGroups;
  todoCount: number;
  latePaged: Paged;
  nextPaged: Paged;
  oldPaged: Paged;
  donePaged: Paged;
  showOldMisses: boolean;
  onToggleOldMisses: () => void;
  selectedHomework: any;
  onSelectHomework: (hw: any | null) => void;
}

export function HomeworkView(p: HomeworkViewProps) {
  const { band } = useAgeBand();
  const { en, vi, beneath } = useCopy();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const teen = band === "teen";
  const emoji = (e: string) => (teen ? null : e);
  const { assignments, groups, todoCount, isLoading, isError } = p;
  const open = (a: any) => p.onSelectHomework(a);
  // the grade moment is up: the page's own Pip steps out (one Pip per screen)
  const [momentUp, setMomentUp] = useState(false);

  // The title: the page's own words, an emoji only where the band may have one.
  const allDone = todoCount === 0 && !isLoading;
  const heroKey: StudentCopyKey = isError ? "hw.title" : allDone ? "hw.hero.allDone" : "hw.hero.doing";
  const heroEmoji = isError ? "" : allDone ? " 🎉" : " 💪";
  const heroSubtitle = isLoading
    ? "Finding your homework…"
    : isError
      ? "We couldn't load your homework."
      : todoCount === 0
        ? "You have nothing to do right now. Great job!"
        : `You have ${todoCount} ${todoCount === 1 ? "thing" : "things"} to do.`;

  const hero = (
    <section className={cn(CARD, "min-w-0")}>
      <p className={LABEL}><Label k="hw.title" /></p>
      <h1 className="mt-2 font-display text-hec-h1 font-medium text-hec-ink [[data-hec-scale=young]_&]:font-bold">
        <span className="inline-block min-w-0">
          <span>{en(heroKey)}{teen ? "" : heroEmoji}</span>
          {beneath && <span lang="vi" className="block text-hec-small font-normal text-hec-ink-soft">{vi(heroKey)}</span>}
        </span>
      </h1>
      <p className="mt-1 max-w-2xl text-hec-body text-hec-ink-soft">{heroSubtitle}</p>
      {!isLoading && !isError && assignments.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat value={todoCount} k="hw.stat.todo" />
          <Stat value={groups.late.length} k="hw.stat.late" />
          <Stat value={groups.done.length} k="hw.stat.done" />
        </div>
      )}
    </section>
  );

  const errorCard = (
    <div role="alert" className={cn(CARD, "flex flex-col items-center text-center")}>
      <FileText className="h-6 w-6 text-hec-danger" aria-hidden />
      <p className={cn(CARD_TITLE, "mt-3 break-words")}>We couldn't load your homework.</p>
      <p className="mt-1 max-w-sm text-hec-body text-hec-ink-soft">Check your internet and try again. Your homework is still safe.</p>
      <button
        type="button"
        onClick={() => p.refetch()}
        disabled={p.isFetching}
        className={cn(BUTTON, "mt-4 bg-hec-action text-hec-on-action hover:bg-hec-action/90")}
      >
        {p.isFetching ? "Trying…" : "Try again"}
      </button>
    </div>
  );

  // The junior line about vocabulary cards: only when a count is ALREADY in the cache (no request for it).
  const cachedDue = band === "junior" ? queryClient.getQueryData<any[]>(["srs-due-cards", p.studentId]) : undefined;
  const dueCards = Array.isArray(cachedDue) ? cachedDue.length : 0;

  const finish = (
    <div className="space-y-3">
      <FinishState band={band} />
      {band === "junior" && dueCards > 0 && (
        <p className="text-center text-hec-body text-hec-ink-soft">
          <Bi k="hw.moreCards" vars={{ n: dueCards }} />
        </p>
      )}
    </div>
  );

  const tabs =
    assignments.length === 0 ? (
      <div className={cn(CARD, "flex flex-col items-center text-center")}>
        <FileText className="h-6 w-6 text-hec-ink-soft" aria-hidden />
        <p className={cn(CARD_TITLE, "mt-3")}>No homework yet</p>
        <p className="mt-1 max-w-sm text-hec-body text-hec-ink-soft">Your teachers haven't set any homework. Check back soon!</p>
      </div>
    ) : (
      <Tabs defaultValue={todoCount > 0 ? "todo" : "done"} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1">
          {([
            { v: "todo", k: "hw.tab.todo", n: todoCount },
            { v: "done", k: "hw.tab.done", n: groups.done.length },
            { v: "calendar", k: "hw.tab.calendar" },
          ] as { v: string; k: StudentCopyKey; n?: number }[]).map((t) => (
            <TabsTrigger key={t.v} value={t.v} className="min-h-hec-target gap-2 px-1 text-hec-body font-medium">
              <Label k={t.k} />
              {t.n !== undefined && t.n > 0 && (
                <span className="rounded-full bg-hec-action px-2 text-hec-caption font-medium tabular-nums text-hec-on-action">{t.n}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="todo" className="mt-5 space-y-7">
          {todoCount === 0 && finish}
          {groups.late.length > 0 && (
            <Section emoji={emoji("⏰")} k="hw.section.late" count={groups.late.length}>
              <PagedCards paged={p.latePaged} onOpen={open} lead plain={teen} />
            </Section>
          )}
          {groups.next.length > 0 && (
            <Section emoji={emoji("🎯")} k="hw.section.next" count={groups.next.length}>
              <PagedCards paged={p.nextPaged} onOpen={open} lead={groups.late.length === 0} plain={teen} />
            </Section>
          )}
          {groups.oldMisses.length > 0 && (
            <section className="space-y-3">
              <button
                type="button"
                onClick={p.onToggleOldMisses}
                aria-expanded={p.showOldMisses}
                className={cn(BUTTON_SECONDARY, "w-full justify-between px-4 py-3 text-left")}
              >
                <span className="min-w-0">
                  <Label k="hw.section.old" emoji={emoji("📦")} />
                  <span className={cn(BADGE_NEUTRAL, "ml-2")}>{groups.oldMisses.length}</span>
                </span>
                <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", p.showOldMisses && "rotate-180")} />
              </button>
              {p.showOldMisses && <PagedCards paged={p.oldPaged} onOpen={open} plain={teen} />}
            </section>
          )}
        </TabsContent>

        <TabsContent value="done" className="mt-5 space-y-4">
          {groups.done.length === 0 ? (
            <div className={cn(CARD, "text-center")}>
              {!teen && <p className="text-hec-h1" aria-hidden>📬</p>}
              <p className={cn(CARD_TITLE, "mt-2")}>Nothing sent yet</p>
              <p className="mt-1 text-hec-body text-hec-ink-soft">Homework you send will appear here.</p>
            </div>
          ) : (
            <PagedCards paged={p.donePaged} onOpen={open} plain={teen} />
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-5">
          <AssignmentCalendar
            role="student"
            onSelectAssignment={(assignment) => {
              const hw = assignments.find((h: any) => h.id === assignment.id);
              if (hw) p.onSelectHomework(hw);
            }}
          />
        </TabsContent>
      </Tabs>
    );

  const streak = assignments.length > 0 ? <HomeworkStreakCard studentId={p.studentId} assignments={assignments} /> : null;
  const dialog = p.selectedHomework ? (
    <HomeworkDetailDialog homework={p.selectedHomework} studentId={p.studentId} onClose={() => p.onSelectHomework(null)} />
  ) : null;

  if (band === "early") {
    const card = groups.late[0] ?? groups.next[0] ?? null;
    return (
      <>
        {assignments.length > 0 && <GradeCelebration studentId={p.studentId} assignments={assignments} onActiveChange={setMomentUp} />}
        <EarlyHomework
          ready={!isLoading && !isError}
          todoCount={todoCount}
          card={isLoading || isError ? null : card}
          onOpen={open}
          dialogOpen={!!p.selectedHomework || momentUp}
          loading={isLoading ? <PlaceholderCard rows={2} /> : null}
          errorBlock={isError ? errorCard : null}
          grownUps={
            <>
              {tabs}
              {streak}
            </>
          }
        />
        {dialog}
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="min-w-0 space-y-4 sm:space-y-6">
        {hero}
        <PlaceholderCard rows={4} />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="mx-auto min-w-0 max-w-5xl space-y-5 sm:space-y-6">
        {hero}
        {errorCard}
      </div>
    );
  }

  return (
    <>
      {assignments.length > 0 && <GradeCelebration studentId={p.studentId} assignments={assignments} />}
      <Arrive scope="student-homework" userId={user?.id} className="mx-auto min-w-0 max-w-5xl space-y-5 sm:space-y-6">
        <ArriveItem index={0}>{hero}</ArriveItem>
        <ArriveItem index={1}>{tabs}</ArriveItem>
        {streak && <ArriveItem index={2}>{streak}</ArriveItem>}
      </Arrive>
      {dialog}
    </>
  );
}
