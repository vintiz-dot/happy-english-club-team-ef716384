/**
 * Stars Sync: the tools.
 *
 * "Pixel Pal child 121 is not matched" tells an admin nothing they can act
 * on. The main tool here turns it into a question they can answer: it works
 * out who child 121 most probably is, and asks - "Is Bin from Pixel Pal
 * Nguyễn Gia Bình on HEC?" - with the reasons, and what saying yes would do.
 * Each answer rules that child out for everybody else, so the next question
 * is easier than the last. See src/lib/starsLink.ts for how it reasons.
 *
 * NOTHING LINKS ITSELF. However sure the tool is, a link is an admin saying
 * yes (docs/STARS_SYNC_SPEC.md, decision 2): a wrong one moves one child's
 * marks and points onto another. What is never in doubt is that the admin
 * is looking at a suggestion and why it was made.
 *
 * Answers of "no" and "not in HEC" are remembered in this browser. They hold
 * no names, and losing them costs only being asked again.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SectionHeader } from "@/components/quest/SectionHeader";
import { dayjs } from "@/lib/date";
import { cn } from "@/lib/utils";
import { foldText } from "@/lib/starsNames";
import {
  auditLinks, buildQuestions, displayName, suggestClass,
  type LinkCandidate, type LinkQuestion, type PixelPalChild, type Reason,
} from "@/lib/starsLink";
import type { StarsRoster } from "@/lib/starsRoster";
import type { RecordsView, StarsRecord } from "@/lib/starsRecords";
import { useLinkEvidence, type RosterState } from "./useStarsData";
import {
  AlertTriangle, BookOpen, Check, CheckCircle2, ChevronRight, ClipboardPaste, Loader2, Minus,
  PartyPopper, Play, Search, Undo2, Users, X,
} from "lucide-react";
import { toast } from "sonner";

const REJECTED_KEY = "hec.stars.link.rejected.v1";
const SET_ASIDE_KEY = "hec.stars.link.setaside.v1";
const IGNORED_CLASSES_KEY = "hec.stars.link.ignoredclasses.v1";
const CHECKED_LINKS_KEY = "hec.stars.link.checked.v1";

function useStoredSet(key: string) {
  const [value, setValue] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : []);
    } catch {
      return new Set<string>();
    }
  });
  const change = (next: Set<string>) => {
    setValue(next);
    try {
      localStorage.setItem(key, JSON.stringify([...next]));
    } catch {
      // Without storage the answer holds until the page is closed.
    }
  };
  return [value, change] as const;
}

const shortDate = (date: string | null) => (date ? dayjs(date).format("D MMM") : "");

function sureness(confidence: number): { label: string; tone: string } {
  if (confidence >= 0.85) return { label: "Very likely", tone: "text-hec-leaf" };
  if (confidence >= 0.6) return { label: "Likely", tone: "text-hec-leaf" };
  if (confidence >= 0.3) return { label: "Possible", tone: "text-hec-warn" };
  return { label: "Long shot", tone: "text-hec-ink-soft" };
}

function ReasonList({ reasons }: { reasons: Reason[] }) {
  if (reasons.length === 0) return null;
  return (
    <ul className="space-y-1">
      {reasons.map((reason) => (
        <li key={reason.text} className="flex items-start gap-2 text-hec-small">
          {reason.sign > 0 && <Check className="mt-1 h-4 w-4 shrink-0 text-hec-leaf" />}
          {reason.sign < 0 && <X className="mt-1 h-4 w-4 shrink-0 text-hec-danger" />}
          {reason.sign === 0 && <Minus className="mt-1 h-4 w-4 shrink-0 text-hec-ink-faint" />}
          <span className="min-w-0 break-words text-hec-ink-soft">{reason.text}</span>
        </li>
      ))}
    </ul>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const sure = sureness(confidence);
  return (
    <div className="flex items-center gap-2">
      <Progress value={Math.round(confidence * 100)} className="h-2 w-24 bg-hec-sunken" aria-label={`${sure.label}, ${Math.round(confidence * 100)} percent`} />
      <span className={cn("text-hec-caption font-medium", sure.tone)}>{sure.label}</span>
    </div>
  );
}

/** What Pixel Pal holds about this child, in a sentence or two. */
function WhatPixelPalSays({ question }: { question: LinkQuestion }) {
  const { waiting, classNames } = question;
  if (waiting.records === 0) {
    return (
      <p className="text-hec-small text-hec-ink-soft">
        No records are waiting on this child{classNames.length ? ` in ${classNames.join(" or ")}` : ""} yet.
        Linking now means none will.
      </p>
    );
  }
  const parts: string[] = [];
  if (waiting.marks > 0) {
    const away = waiting.absences.length > 0
      ? ` (away ${waiting.absences.slice(0, 4).map(shortDate).join(", ")}${waiting.absences.length > 4 ? ` and ${waiting.absences.length - 4} more` : ""})`
      : "";
    parts.push(`${waiting.marks} register mark${waiting.marks === 1 ? "" : "s"}${away}`);
  }
  if (waiting.awards > 0) {
    const total = waiting.pointsTotal;
    parts.push(`${waiting.awards} point award${waiting.awards === 1 ? "" : "s"} (${total > 0 ? "+" : ""}${total})`);
  }
  if (waiting.grades > 0) {
    parts.push(`${waiting.grades} grade${waiting.grades === 1 ? "" : "s"}`);
  }
  const span = waiting.firstDate === waiting.lastDate
    ? `on ${shortDate(waiting.firstDate)}`
    : `from ${shortDate(waiting.firstDate)} to ${shortDate(waiting.lastDate)}`;
  return (
    <p className="text-hec-small text-hec-ink-soft">
      A yes applies <strong className="font-medium tabular-nums text-hec-ink">{parts.join(" and ")}</strong> {span}
      {classNames.length ? ` in ${classNames.join(" or ")}` : ""}, on the next run.
    </p>
  );
}

/** Find a child anywhere in HEC, for when the tool's list is not right. */
function ChildSearch({ hecChildren, linkedTo, classNames, onPick, placeholder }: {
  hecChildren: { id: string; name: string; classIds: string[] }[];
  linkedTo: Map<string, string>;
  classNames: Map<string, string>;
  onPick: (id: string) => void;
  placeholder: string;
}) {
  return (
    <Command filter={(value, search) => (value.includes(foldText(search)) ? 1 : 0)} className="rounded-hec-md border border-hec-line-strong">
      <CommandInput placeholder={placeholder} aria-label={placeholder} />
      <CommandList className="max-h-64">
        <CommandEmpty>Nobody by that name.</CommandEmpty>
        <CommandGroup>
          {hecChildren.map((child) => {
            const taken = linkedTo.get(child.id);
            const classes = child.classIds.map((id) => classNames.get(id)).filter(Boolean).join(", ");
            return (
              <CommandItem
                key={child.id}
                value={foldText(`${child.name} ${child.id}`)}
                disabled={Boolean(taken)}
                onSelect={() => onPick(child.id)}
                className="flex min-h-hec-target items-start justify-between gap-2 py-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block whitespace-normal break-words hyphens-none text-hec-body text-hec-ink">{child.name}</span>
                  {classes && <span className="block whitespace-normal break-words hyphens-none text-hec-caption text-hec-ink-soft">{classes}</span>}
                </span>
                {taken && <span className="shrink-0 text-hec-caption tabular-nums text-hec-ink-soft">Already Pixel Pal no. {taken}</span>}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export interface StarsToolsProps {
  records: StarsRecord[];
  roster: StarsRoster;
  rosterState: RosterState;
  rosterFetchedAt: string | null;
  pasted: string;
  onPaste: (text: string) => void;
  pasteError: string | null;
  pastedCount: number;
  classMap: { stars_class_id: string; class_id: string }[];
  studentMap: { stars_student_id: string; student_id: string }[];
  classes: { id: string; name: string; is_active: boolean | null }[];
  homeworkEngine: boolean;
  /** Asked for from elsewhere on the page: a child, or a class, to deal with now. */
  focusChild: string | null;
  focusClass: string | null;
  onFocusHandled: () => void;
  onShowRecords: (filters: Partial<RecordsView>) => void;
  onRunNow: () => void;
  running: boolean;
  canRun: boolean;
}

export function StarsTools({
  records, roster, rosterState, rosterFetchedAt, pasted, onPaste, pasteError, pastedCount,
  classMap, studentMap, classes, homeworkEngine, focusChild, focusClass, onFocusHandled, onShowRecords, onRunNow,
  running, canRun,
}: StarsToolsProps) {
  const queryClient = useQueryClient();
  const [rejected, setRejected] = useStoredSet(REJECTED_KEY);
  const [setAside, setSetAside] = useStoredSet(SET_ASIDE_KEY);
  const [ignoredClasses, setIgnoredClasses] = useStoredSet(IGNORED_CLASSES_KEY);
  const [checkedLinks, setCheckedLinks] = useStoredSet(CHECKED_LINKS_KEY);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [currentRef, setCurrentRef] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [linkedNow, setLinkedNow] = useState<{ ref: string; label: string; studentName: string }[]>([]);
  const [outsideClass, setOutsideClass] = useState<{ ref: string; id: string; name: string; label: string } | null>(null);
  const [classPicks, setClassPicks] = useState<Record<string, string>>({});
  const toolRef = useRef<HTMLDivElement>(null);
  const classToolRef = useRef<HTMLDivElement>(null);

  const classIdByRef = useMemo(() => new Map(classMap.map((m) => [m.stars_class_id, m.class_id])), [classMap]);
  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);
  const links = useMemo(() => new Map(studentMap.map((m) => [m.stars_student_id, m.student_id])), [studentMap]);
  const refByChild = useMemo(() => new Map(studentMap.map((m) => [m.student_id, m.stars_student_id])), [studentMap]);
  const mappedClassIds = useMemo(() => classMap.map((m) => m.class_id), [classMap]);

  // ---------------------------------------------- who needs an answer
  // Everybody in the feed who is not linked, plus everybody on Pixel Pal's
  // list in a class that is mapped. A child on the list in a class HEC has
  // no use for is not worth a question; one archived with nothing waiting
  // is not either.
  const children = useMemo<PixelPalChild[]>(() => {
    const found = new Map<string, Set<string>>();
    for (const r of records) {
      if (!r.childRef || links.has(r.childRef)) continue;
      if (r.kind === "retraction") continue;
      if (r.why !== "child_unlinked" && r.why !== "class_unmapped") continue;
      const classes = found.get(r.childRef) ?? new Set<string>();
      if (r.classRef) classes.add(r.classRef);
      found.set(r.childRef, classes);
    }
    for (const [ref, classRefs] of roster.studentClasses) {
      if (links.has(ref) || found.has(ref) || roster.inactive.has(ref)) continue;
      if (classRefs.some((c) => classIdByRef.has(c))) found.set(ref, new Set(classRefs));
    }
    return [...found.entries()]
      .map(([ref, classRefs]) => ({
        ref,
        name: roster.students.get(ref) ?? null,
        classRefs: [...new Set([...classRefs, ...(roster.studentClasses.get(ref) ?? [])])],
        inactive: roster.inactive.has(ref),
      }))
      .filter((child) => !child.classRefs.length || !child.classRefs.every((c) => ignoredClasses.has(c)));
  }, [records, links, roster, classIdByRef, ignoredClasses]);

  const childRefs = useMemo(() => children.map((c) => c.ref), [children]);
  const evidence = useLinkEvidence(childRefs, mappedClassIds, true);

  const questions = useMemo(() => {
    if (!evidence.data) return [];
    return buildQuestions({
      children,
      records: evidence.data.records,
      hecChildren: evidence.data.hecChildren,
      marks: evidence.data.marks,
      awards: evidence.data.awards,
      classMap: classIdByRef,
      classNames: classNameById,
      pixelPalClassNames: roster.classes,
      links,
      rejected,
      setAside,
      today: dayjs().tz().format("YYYY-MM-DD"),
    });
  }, [evidence.data, children, classIdByRef, classNameById, roster.classes, links, rejected, setAside]);

  // The question on screen: the one asked for, or the easiest not skipped.
  const queue = useMemo(() => {
    const notSkipped = questions.filter((q) => !skipped.includes(q.child.ref));
    const skippedOnes = skipped
      .map((ref) => questions.find((q) => q.child.ref === ref))
      .filter((q): q is LinkQuestion => Boolean(q));
    return [...notSkipped, ...skippedOnes];
  }, [questions, skipped]);
  const current = queue.find((q) => q.child.ref === currentRef) ?? queue[0] ?? null;

  useEffect(() => { setSearching(false); setShowAll(false); }, [current?.child.ref]);

  useEffect(() => {
    if (focusChild) {
      setCurrentRef(focusChild);
      toolRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      onFocusHandled();
    } else if (focusClass) {
      classToolRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      onFocusHandled();
    }
  }, [focusChild, focusClass, onFocusHandled]);

  // ---------------------------------------------------- the answers
  const invalidate = () => {
    for (const key of ["stars-student-map", "stars-class-map", "stars-readiness", "stars-status", "stars-records"]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const unlink = useMutation({
    mutationFn: async (ref: string) => {
      const { error } = await supabase.from("stars_student_map").delete().eq("stars_student_id", ref);
      if (error) throw error;
      return ref;
    },
    onSuccess: (ref) => {
      setLinkedNow((list) => list.filter((entry) => entry.ref !== ref));
      setCurrentRef(ref);
      invalidate();
      toast.success("Link removed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not remove that link"),
  });

  const link = useMutation({
    mutationFn: async (answer: { ref: string; studentId: string; studentName: string; label: string }) => {
      const { error } = await supabase
        .from("stars_student_map")
        .insert({ stars_student_id: answer.ref, student_id: answer.studentId });
      if (error) {
        // The map is one-to-one in both directions, on purpose.
        if (error.code === "23505") {
          throw new Error(`${answer.studentName} is already linked to another Pixel Pal child, or this Pixel Pal child already has a link. Reload and look again.`);
        }
        throw error;
      }
      return answer;
    },
    onSuccess: (answer) => {
      setLinkedNow((list) => [{ ref: answer.ref, label: answer.label, studentName: answer.studentName }, ...list]);
      setSkipped((list) => list.filter((ref) => ref !== answer.ref));
      setCurrentRef(null);
      invalidate();
      toast.success(`${answer.label} is ${answer.studentName}`, {
        action: { label: "Undo", onClick: () => unlink.mutate(answer.ref) },
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save that link"),
  });

  const answerYes = (question: LinkQuestion, candidate: { studentId: string; name: string; inClass?: boolean }) => {
    const label = displayName(question.child);
    if (candidate.inClass === false) {
      setOutsideClass({ ref: question.child.ref, id: candidate.studentId, name: candidate.name, label });
      return;
    }
    link.mutate({ ref: question.child.ref, studentId: candidate.studentId, studentName: candidate.name, label });
  };

  const answerNo = (question: LinkQuestion, candidate: LinkCandidate) => {
    setRejected(new Set(rejected).add(`${question.child.ref}:${candidate.studentId}`));
    setCurrentRef(question.child.ref);
    toast(`Not ${candidate.name}. Crossed off for ${displayName(question.child)}.`, {
      action: {
        label: "Undo",
        onClick: () => {
          const next = new Set(rejected);
          next.delete(`${question.child.ref}:${candidate.studentId}`);
          setRejected(next);
        },
      },
    });
  };

  const skip = (question: LinkQuestion) => {
    setSkipped((list) => [...list.filter((ref) => ref !== question.child.ref), question.child.ref]);
    setCurrentRef(null);
  };

  const notInHec = (question: LinkQuestion) => {
    setSetAside(new Set(setAside).add(question.child.ref));
    setCurrentRef(null);
    toast(`${displayName(question.child)} set aside. Their records keep waiting, and turn refused 60 days after the lesson.`);
  };

  // ---------------------------------------------- everybody, for search
  const searchable = useMemo(() => {
    const all = (evidence.data?.hecChildren ?? []).filter((c) => c.active);
    const inClass = new Set(current?.child.classRefs.map((ref) => classIdByRef.get(ref)).filter(Boolean));
    return all
      .map((c) => ({
        id: c.id,
        name: c.name,
        classIds: [...new Set(c.enrollments.map((e) => e.classId))],
        here: c.enrollments.some((e) => inClass.has(e.classId)),
      }))
      .sort((a, b) => Number(b.here) - Number(a.here) || a.name.localeCompare(b.name));
  }, [evidence.data, current, classIdByRef]);

  // ---------------------------------------------------------- classes
  const unmappedClasses = useMemo(() => {
    const found = new Map<string, { ref: string; name: string | null; records: number }>();
    for (const r of records) {
      if (r.why !== "class_unmapped" || !r.classRef) continue;
      const held = found.get(r.classRef) ?? { ref: r.classRef, name: roster.classes.get(r.classRef) ?? null, records: 0 };
      held.records += 1;
      found.set(r.classRef, held);
    }
    for (const [ref, name] of roster.classes) {
      if (!classIdByRef.has(ref) && !found.has(ref)) found.set(ref, { ref, name, records: 0 });
    }
    return [...found.values()]
      .filter((c) => !ignoredClasses.has(c.ref))
      .sort((a, b) => b.records - a.records);
  }, [records, roster.classes, classIdByRef, ignoredClasses]);

  const freeClasses = useMemo(
    () => classes.filter((c) => !mappedClassIds.includes(c.id) && c.is_active !== false),
    [classes, mappedClassIds],
  );

  const linkClass = useMutation({
    mutationFn: async (v: { ref: string; classId: string }) => {
      const { error } = await supabase.from("stars_class_map").insert({ stars_class_id: v.ref, class_id: v.classId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Class linked. Its waiting records apply on the next run."); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not link that class"),
  });

  // ------------------------------------------------- links worth checking
  const audits = useMemo(() => {
    if (!evidence.data) return [];
    const notEnrolled = new Map<string, number>();
    const classRefsOf = new Map<string, string[]>(roster.studentClasses);
    for (const r of records) {
      if (!r.childRef) continue;
      if (r.why === "not_enrolled") notEnrolled.set(r.childRef, (notEnrolled.get(r.childRef) ?? 0) + 1);
      if (r.classRef && !classRefsOf.has(r.childRef)) classRefsOf.set(r.childRef, [r.classRef]);
    }
    return auditLinks({
      links,
      names: roster.students,
      hecChildren: evidence.data.hecChildren,
      classRefsOf,
      classMap: classIdByRef,
      classNames: classNameById,
      notEnrolledWaiting: notEnrolled,
    }).filter((a) => !checkedLinks.has(`${a.ref}:${a.studentId}:${a.worry}`));
  }, [evidence.data, records, roster, links, classIdByRef, classNameById, checkedLinks]);

  // --------------------------------------------------------- children left
  const freeInClass = useMemo(() => {
    if (!evidence.data) return [];
    const linked = new Set(links.values());
    return mappedClassIds
      .map((classId) => ({
        classId,
        name: classNameById.get(classId) ?? "Class",
        children: evidence.data.hecChildren
          .filter((c) => c.active && !linked.has(c.id) && c.enrollments.some((e) =>
            e.classId === classId && (!e.end || e.end >= dayjs().tz().format("YYYY-MM-DD"))))
          .map((c) => c.name)
          .sort((a, b) => a.localeCompare(b)),
      }))
      .filter((group) => group.children.length > 0);
  }, [evidence.data, links, mappedClassIds, classNameById]);

  // ---------------------------------------------------------- homework
  const homework = useMemo(() => {
    const assignments = records.filter((r) => r.kind === "homework");
    const grades = records.filter((r) => r.kind === "grade");
    const awards = records.filter((r) => r.kind === "points" && r.category === "homework");
    return {
      assignments: assignments.length,
      grades: grades.length,
      applied: [...assignments, ...grades].filter((r) => r.result === "applied").length,
      parked: [...assignments, ...grades].filter((r) => r.why === "unsupported").length,
      awards: awards.length,
      awardsApplied: awards.filter((r) => r.result === "applied").length,
      awardsStuck: awards.filter((r) => r.result === "waiting" || r.result === "refused").length,
      lookalikes: records.filter((r) => r.homeworkLookalike).length,
    };
  }, [records]);

  const hasNames = roster.students.size > 0;
  const total = queue.length + linkedNow.length;
  const waitingTotal = queue.reduce((sum, q) => sum + q.waiting.records, 0);
  const setAsideChildren = [...setAside].filter((ref) => !links.has(ref));

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------- whose names */}
      <NamesSource
        state={rosterState}
        fetchedAt={rosterFetchedAt}
        hasNames={hasNames}
        pasted={pasted}
        onPaste={onPaste}
        pasteError={pasteError}
        pastedCount={pastedCount}
      />

      {/* ------------------------------------------------ the main tool */}
      <div ref={toolRef} className="scroll-mt-20 space-y-3">
        <SectionHeader title="Find and link children" subtitle="Answer a question at a time. Nothing links until you say so." />

        {evidence.isLoading ? (
          <Card><CardContent className="flex items-center gap-2 py-8 text-hec-small text-hec-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" /> Working out who is who…
          </CardContent></Card>
        ) : evidence.error ? (
          <Card className="border-hec-danger/30 bg-hec-danger-tint"><CardContent className="py-6 text-hec-small text-hec-ink">
            <p className="font-medium text-hec-danger">HEC's side of this could not be read.</p>
            <p className="mt-1 break-words text-hec-ink-soft">{evidence.error instanceof Error ? evidence.error.message : ""}</p>
          </CardContent></Card>
        ) : !current ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <PartyPopper className="h-8 w-8 text-hec-leaf" aria-hidden="true" />
              <div>
                <p className="text-hec-body font-medium text-hec-ink">Every Pixel Pal child with a record is linked.</p>
                <p className="mt-1 text-hec-small text-hec-ink-soft">
                  {linkedNow.length > 0
                    ? `You linked ${linkedNow.length} just now. Their waiting records apply on the next run, or now if you prefer.`
                    : "Nothing is waiting on a link."}
                </p>
              </div>
              {linkedNow.length > 0 && (
                <Button onClick={onRunNow} disabled={running || !canRun}>
                  {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  Apply them now
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[17rem_1fr]">
            {/* who is left */}
            <Card className="order-2 lg:order-1">
              <CardContent className="space-y-4 pt-4 sm:pt-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-hec-small tabular-nums">
                    <span className="font-medium text-hec-ink">{queue.length} to go</span>
                    {waitingTotal > 0 && <span className="text-hec-ink-soft">{waitingTotal} record{waitingTotal === 1 ? "" : "s"} waiting</span>}
                  </div>
                  <Progress value={total > 0 ? (linkedNow.length / total) * 100 : 0} className="h-2 bg-hec-sunken" aria-label="Children linked so far" />
                </div>
                <ul className="-mx-1 max-h-[26rem] space-y-1 overflow-y-auto p-1">
                  {queue.map((q) => {
                    const on = q.child.ref === current.child.ref;
                    const top = q.candidates[0];
                    return (
                      <li key={q.child.ref}>
                        <button
                          type="button"
                          aria-current={on}
                          onClick={() => setCurrentRef(q.child.ref)}
                          className={cn(
                            "flex min-h-hec-target w-full items-start gap-2 rounded-hec-md border border-transparent px-2 py-2 text-left text-hec-small text-hec-ink transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring",
                            on && "border-hec-brass bg-hec-sunken",
                          )}
                        >
                          <span className={cn(
                            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                            q.mode === "confirm" ? "bg-hec-leaf" : q.mode === "choose" ? "bg-hec-warn" : "bg-hec-line-strong",
                          )} />
                          <span className="min-w-0 flex-1">
                            <span className="block whitespace-normal break-words hyphens-none text-hec-body font-medium">{displayName(q.child)}</span>
                            <span className="block whitespace-normal break-words hyphens-none text-hec-caption text-hec-ink-soft">
                              {q.mode === "class_first" ? "Class not linked"
                                : q.mode === "confirm" ? `Probably ${top.name}`
                                : q.mode === "choose" && q.child.name ? `${top.name} or another`
                                : q.mode === "choose" ? "Nothing to go on yet"
                                : "Nobody obvious"}
                            </span>
                          </span>
                          {q.waiting.records > 0 && (
                            <span className="shrink-0 text-hec-caption tabular-nums text-hec-ink-soft">{q.waiting.records}</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {setAsideChildren.length > 0 && (
                  <button type="button" className="min-h-hec-target w-full rounded-hec-sm text-left text-hec-caption text-hec-brass underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                    onClick={() => setSetAside(new Set())}>
                    {setAsideChildren.length} set aside as not in HEC. Ask again
                  </button>
                )}
              </CardContent>
            </Card>

            {/* the question */}
            <Card className="order-1 lg:order-2">
              <CardContent className="space-y-4 pt-4 sm:pt-6">
                <div className="flex flex-wrap items-center gap-2 text-hec-caption text-hec-ink-soft">
                  <Badge variant="outline" className="font-normal tabular-nums">Pixel Pal no. {current.child.ref}</Badge>
                  {current.classNames.map((name) => <Badge key={name} variant="outline" className="whitespace-normal break-words font-normal">{name}</Badge>)}
                  {current.ruledOut > 0 && <span>{current.ruledOut} ruled out</span>}
                </div>

                <h3 className="whitespace-normal break-words hyphens-none text-balance font-display text-hec-h2 font-medium text-hec-ink">{current.question}</h3>
                {current.hint && <p className="text-hec-small text-hec-ink-soft">{current.hint}</p>}
                <WhatPixelPalSays question={current} />

                {current.mode === "confirm" && current.candidates[0] && (
                  <div className="space-y-4 rounded-hec-md border border-hec-line p-4">
                    <ConfidenceBar confidence={current.candidates[0].confidence} />
                    <ReasonList reasons={current.candidates[0].reasons} />
                    <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
                      <Button className="w-full sm:w-auto" disabled={link.isPending} onClick={() => answerYes(current, current.candidates[0])}>
                        {link.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Yes, that is them
                      </Button>
                      <Button variant="outline" className="w-full sm:w-auto" disabled={link.isPending} onClick={() => answerNo(current, current.candidates[0])}>
                        No
                      </Button>
                    </div>
                    {current.candidates.length > 1 && (
                      <p className="break-words text-hec-small text-hec-ink-soft">
                        If not, next most likely: {current.candidates.slice(1, 3).map((c) => c.name).join(", ")}.
                      </p>
                    )}
                  </div>
                )}

                {current.mode === "choose" && (
                  <ul className="space-y-2">
                    {(showAll ? current.candidates : current.candidates.slice(0, 5)).map((candidate) => (
                      <li key={candidate.studentId} className="space-y-2 rounded-hec-md border border-hec-line p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0 flex-1 basis-48">
                            <p className="whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink">{candidate.name}</p>
                            <ConfidenceBar confidence={candidate.confidence} />
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button size="sm" disabled={link.isPending} onClick={() => answerYes(current, candidate)}>This is them</Button>
                            <Button size="sm" variant="ghost" disabled={link.isPending} aria-label={`Not ${candidate.name}`} onClick={() => answerNo(current, candidate)}>
                              Not them
                            </Button>
                          </div>
                        </div>
                        <ReasonList reasons={candidate.reasons} />
                      </li>
                    ))}
                    {!showAll && current.candidates.length > 5 && (
                      <Button size="sm" variant="ghost" className="w-full" onClick={() => setShowAll(true)}>
                        Show the other {current.candidates.length - 5}
                      </Button>
                    )}
                  </ul>
                )}

                {current.mode === "class_first" && (
                  <Button variant="outline" onClick={() => classToolRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                    Link the class
                  </Button>
                )}

                {(current.mode === "search" || searching) && (
                  <ChildSearch
                    hecChildren={searchable}
                    linkedTo={refByChild}
                    classNames={classNameById}
                    placeholder={`Search all of HEC for ${displayName(current.child)}…`}
                    onPick={(id) => {
                      const child = searchable.find((c) => c.id === id);
                      if (child) answerYes(current, { studentId: child.id, name: child.name, inClass: child.here });
                    }}
                  />
                )}

                <div className="flex flex-wrap items-center gap-2 border-t border-hec-line pt-4">
                  {current.mode !== "search" && current.mode !== "class_first" && (
                    <Button size="sm" variant="ghost" className="gap-1" onClick={() => setSearching((on) => !on)}>
                      <Search className="h-4 w-4" /> Someone else
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => skip(current)}>Skip for now</Button>
                  <Button size="sm" variant="ghost" onClick={() => notInHec(current)}>Not in HEC</Button>
                  <Button size="sm" variant="ghost" className="gap-1 sm:ml-auto"
                    onClick={() => onShowRecords({ children: [current.child.ref] })}>
                    <BookOpen className="h-4 w-4" /> See their records
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {linkedNow.length > 0 && current && (
          <Card>
            <CardContent className="space-y-2 pt-4 sm:pt-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-hec-body font-medium tabular-nums text-hec-ink">Linked just now ({linkedNow.length})</p>
                <Button size="sm" variant="outline" onClick={onRunNow} disabled={running || !canRun}>
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Apply waiting records now
                </Button>
              </div>
              <ul className="divide-y divide-hec-line">
                {linkedNow.map((entry) => (
                  <li key={entry.ref} className="flex flex-wrap items-center justify-between gap-2 py-2 text-hec-small">
                    <span className="min-w-0 flex-1 basis-48 whitespace-normal break-words hyphens-none"><span className="text-hec-ink-soft">{entry.label}</span> is <strong className="font-medium text-hec-ink">{entry.studentName}</strong></span>
                    <Button size="sm" variant="ghost" className="gap-1" disabled={unlink.isPending} onClick={() => unlink.mutate(entry.ref)}>
                      <Undo2 className="h-4 w-4" /> Undo
                    </Button>
                  </li>
                ))}
              </ul>
              <p className="text-hec-caption text-hec-ink-soft">
                Undo stops anything further reaching that child. Marks and points a run has already applied stay.
              </p>
            </CardContent>
          </Card>
        )}

        {freeInClass.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="group flex min-h-hec-target items-center gap-2 rounded-hec-sm text-left text-hec-small tabular-nums text-hec-ink-soft hover:text-hec-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring">
              <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-hec-1 ease-hec group-data-[state=open]:rotate-90" />
              <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
              Children in HEC with no Pixel Pal link ({freeInClass.reduce((sum, g) => sum + g.children.length, 0)})
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {freeInClass.map((group) => (
                <div key={group.classId} className="rounded-hec-md border border-hec-line bg-hec-surface p-4">
                  <p className="break-words text-hec-small font-medium text-hec-ink">{group.name}</p>
                  <ul className="mt-2 space-y-1 break-words text-hec-small text-hec-ink-soft">
                    {group.children.map((name) => <li key={name}>{name}</li>)}
                  </ul>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* ------------------------------------------------------ classes */}
      {unmappedClasses.length > 0 && (
        <div ref={classToolRef} className="scroll-mt-20 space-y-3">
          <SectionHeader title="Link classes" subtitle="Pixel Pal classes HEC does not know yet. Their children cannot be placed until this is done." />
          <Card>
            <CardContent className="divide-y divide-hec-line pt-2 sm:pt-4">
              {unmappedClasses.map((c) => {
                const suggestion = suggestClass(c.name, freeClasses);
                const picked = classPicks[c.ref] ?? suggestion?.id ?? "";
                return (
                  <div key={c.ref} className="flex flex-wrap items-center justify-between gap-4 py-4">
                    <div className="min-w-0 flex-1 basis-60">
                      <p className="whitespace-normal break-words hyphens-none text-hec-body font-medium text-hec-ink">{c.name ?? `Pixel Pal class no. ${c.ref}`}</p>
                      <p className="break-words text-hec-small tabular-nums text-hec-ink-soft">
                        Pixel Pal no. {c.ref}
                        {c.records > 0 ? ` · ${c.records} record${c.records === 1 ? "" : "s"} waiting` : ""}
                        {suggestion ? ` · probably ${suggestion.name}` : ""}
                      </p>
                    </div>
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                      <Select value={picked} onValueChange={(v) => setClassPicks((p) => ({ ...p, [c.ref]: v }))}>
                        <SelectTrigger aria-label={`HEC class for ${c.name ?? c.ref}`} className="w-full text-hec-small sm:w-[220px]">
                          <SelectValue placeholder="Choose the HEC class" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {freeClasses.map((option) => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" disabled={!picked || linkClass.isPending}
                        onClick={() => linkClass.mutate({ ref: c.ref, classId: picked })}>
                        Link
                      </Button>
                      <Button size="sm" variant="ghost"
                        onClick={() => setIgnoredClasses(new Set(ignoredClasses).add(c.ref))}>
                        Not ours
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------------------------------------------- link health */}
      {audits.length > 0 && (
        <div className="space-y-3">
          <SectionHeader title="Links worth a second look" subtitle="A wrong link moves one child's marks and points onto another." />
          <Card className="border-hec-warn/30">
            <CardContent className="divide-y divide-hec-line pt-2 sm:pt-4">
              {audits.map((a) => {
                const key = `${a.ref}:${a.studentId}:${a.worry}`;
                return (
                  <div key={key} className="flex flex-wrap items-center justify-between gap-4 py-4">
                    <div className="min-w-0 flex-1 basis-60">
                      <p className="flex items-start gap-2 text-hec-body font-medium text-hec-ink">
                        <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-hec-warn" aria-hidden="true" />
                        <span className="min-w-0 whitespace-normal break-words hyphens-none">{a.pixelPalName ?? `Pixel Pal no. ${a.ref}`} is linked to {a.studentName}</span>
                      </p>
                      <p className="break-words pl-6 text-hec-small text-hec-ink-soft">{a.detail}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" variant="ghost"
                        onClick={() => setCheckedLinks(new Set(checkedLinks).add(key))}>
                        It is right
                      </Button>
                      <Button size="sm" variant="destructive-quiet" disabled={unlink.isPending}
                        onClick={() => unlink.mutate(a.ref)}>
                        Unlink
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------- homework */}
      <div className="space-y-3">
        <SectionHeader title="Homework check" subtitle="What Pixel Pal has sent about homework, and why it does or does not show." />
        <HomeworkCheck homework={homework} engine={homeworkEngine} onShowRecords={onShowRecords} />
      </div>

      <AlertDialog open={outsideClass !== null} onOpenChange={(open) => { if (!open) setOutsideClass(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">{outsideClass?.name} is not enrolled in this class</AlertDialogTitle>
            <AlertDialogDescription>
              You can still link {outsideClass?.label} to them. Their records will keep waiting until
              {" "}{outsideClass?.name} is enrolled in the class for those dates, because the sync only
              writes where a child is enrolled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (outsideClass) {
                link.mutate({ ref: outsideClass.ref, studentId: outsideClass.id, studentName: outsideClass.name, label: outsideClass.label });
              }
              setOutsideClass(null);
            }}>Link anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------------------------------------------------------- names source */

function NamesSource({ state, fetchedAt, hasNames, pasted, onPaste, pasteError, pastedCount }: {
  state: RosterState;
  fetchedAt: string | null;
  hasNames: boolean;
  pasted: string;
  onPaste: (text: string) => void;
  pasteError: string | null;
  pastedCount: number;
}) {
  const [open, setOpen] = useState(false);
  if (state === "loading") {
    return (
      <p className="flex items-center gap-2 text-hec-small text-hec-ink-soft">
        <Loader2 className="h-4 w-4 animate-spin" /> Asking Pixel Pal for names…
      </p>
    );
  }
  if (state === "live") {
    return (
      <p className="flex items-start gap-2 text-hec-small text-hec-ink-soft">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-hec-leaf" aria-hidden="true" />
        Names come straight from Pixel Pal{fetchedAt ? `, as of ${dayjs(fetchedAt).tz().format("HH:mm")}` : ""}. They are not saved in HEC.
      </p>
    );
  }
  const why = state === "refused"
    ? "Pixel Pal refused the shared secret when asked for its names. Check STARPASSCODE."
    : state === "unavailable"
      ? "Pixel Pal did not answer when asked for its names."
      : "Pixel Pal cannot send HEC its children's names yet.";
  return (
    <Card className={hasNames ? "" : "border-hec-warn/30 bg-hec-warn-tint"}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-start gap-2 font-sans text-hec-h3 font-semibold tabular-nums">
          <ClipboardPaste className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
          {hasNames ? `Using the list you pasted: ${pastedCount} children` : "This tool works far better with names"}
        </CardTitle>
        <CardDescription>
          {why} {hasNames
            ? "It stays in this page and is forgotten when you leave."
            : "Until it can, paste the list Pixel Pal gave you and the questions will use real names. It stays in this page and is forgotten when you leave. Without it, the tool still asks, from each child's class and records."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Collapsible open={open || !hasNames} onOpenChange={setOpen}>
          {hasNames && (
            <CollapsibleTrigger className="flex min-h-hec-target items-center gap-2 rounded-hec-sm text-hec-small text-hec-ink-soft hover:text-hec-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring">
              <ChevronRight className={cn("h-4 w-4 transition-transform duration-hec-1 ease-hec", open && "rotate-90")} /> Paste a newer list
            </CollapsibleTrigger>
          )}
          <CollapsibleContent className="space-y-2 pt-1">
            <Textarea
              aria-label="Pixel Pal's list of children"
              value={pasted}
              onChange={(e) => onPaste(e.target.value)}
              placeholder='{ "classes": { … }, "students": { … }, "student_classes": { … } }'
              className="min-h-[96px] font-mono text-hec-small"
            />
            {pasteError && <p className="break-words text-hec-caption text-hec-danger">{pasteError}</p>}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------- homework */

function HomeworkCheck({ homework, engine, onShowRecords }: {
  homework: {
    assignments: number; grades: number; applied: number; parked: number;
    awards: number; awardsApplied: number; awardsStuck: number; lookalikes: number;
  };
  engine: boolean;
  onShowRecords: (filters: Partial<RecordsView>) => void;
}) {
  const none = homework.assignments === 0 && homework.grades === 0;
  const headline = none
    ? "Pixel Pal has not sent any homework or grades"
    : homework.parked > 0 && !engine
      ? `Pixel Pal is sending homework, and ${homework.parked} record${homework.parked === 1 ? " is" : "s are"} waiting on HEC`
      : `Homework is coming through: ${homework.assignments} assignment${homework.assignments === 1 ? "" : "s"}, ${homework.grades} grade${homework.grades === 1 ? "" : "s"}`;
  const detail = none
    ? engine
      ? "HEC is ready for them. Pixel Pal's feed still only carries register marks, points and withdrawals."
      : "Pixel Pal's feed only carries register marks, points and withdrawals, so nothing can appear under Homework in HEC. Both apps need a change: see docs/PIXEL_PAL_NEXT_STEPS.md."
    : homework.parked > 0 && !engine
      ? "Nothing is lost: they apply by themselves once migration 20261104090000 is applied to HEC's database."
      : `${homework.applied} applied so far. Anything else is listed in Records.`;
  return (
    <Card>
      <CardContent className="space-y-4 pt-4 sm:pt-6">
        <div className="flex items-start gap-2">
          {none || (homework.parked > 0 && !engine)
            ? <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-hec-warn" aria-hidden="true" />
            : <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-hec-leaf" aria-hidden="true" />}
          <div className="min-w-0">
            <p className="break-words text-hec-body font-medium tabular-nums text-hec-ink">{headline}</p>
            <p className="mt-1 break-words text-hec-small text-hec-ink-soft">{detail}</p>
          </div>
        </div>
        <ul className="space-y-2 border-t border-hec-line pt-4 text-hec-small text-hec-ink-soft">
          <li>
            <strong className="font-medium tabular-nums text-hec-ink">{homework.awards}</strong> point award{homework.awards === 1 ? "" : "s"} labelled homework:
            {" "}{homework.awardsApplied} applied, {homework.awardsStuck} stuck. These count toward homework points on the
            leaderboard, but belong to no assignment, so they do not appear under Homework.
          </li>
          {homework.lookalikes > 0 && (
            <li>
              <strong className="font-medium tabular-nums text-hec-ink">{homework.lookalikes}</strong> award{homework.lookalikes === 1 ? "" : "s"} read
              {" "}like homework but arrived as something else, because the teacher's wording did not say "homework".
            </li>
          )}
        </ul>
        <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => onShowRecords({ homeworkOnly: true })}>
          <BookOpen className="h-4 w-4" /> See homework records
        </Button>
      </CardContent>
    </Card>
  );
}
