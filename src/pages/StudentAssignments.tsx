import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { useLoginChallenge } from "@/hooks/useLoginChallenge";
import { fetchStudentHomework, groupHomework, studentHomeworkKey } from "@/lib/studentHomework";
import { usePagedList } from "@/components/shared/PagedListControls";
import { HomeworkView } from "@/components/student/homework/HomeworkView";

// What this page loads, groups and pages is unchanged; HomeworkView draws it by the child's band
// (docs/EXPERIENCE_DESIGN_BRIEF.md G2 to G5). It sits inside Layout so it can read the band.
export default function StudentAssignments() {
  const { studentId } = useStudentProfile();
  const [selectedHomework, setSelectedHomework] = useState<any>(null);
  const [showOldMisses, setShowOldMisses] = useState(false);
  const { recordHomeworkVisit } = useLoginChallenge(studentId);

  useEffect(() => {
    if (studentId) recordHomeworkVisit();
  }, [studentId]);

  // ?homework=<id> (the lesson report's "Review quiz" button) opens that homework once the list is in.
  const [searchParams, setSearchParams] = useSearchParams();
  const wantedHomework = searchParams.get("homework");

  const { data: assignments = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: studentHomeworkKey(studentId),
    queryFn: () => fetchStudentHomework(supabase, studentId!),
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (!wantedHomework || isLoading) return;
    const hw = (assignments as any[]).find((a) => a.id === wantedHomework);
    if (hw) setSelectedHomework(hw);
    const next = new URLSearchParams(searchParams);
    next.delete("homework");
    setSearchParams(next, { replace: true });
  }, [wantedHomework, isLoading, assignments]);

  // Group by what the student has to DO, not by date: anything not yet sent
  // is "to do" (late first), anything sent or marked is "done".
  const groups = useMemo(() => groupHomework(assignments), [assignments]);

  const todoCount = groups.late.length + groups.next.length;

  // CRITICAL: hooks above any conditional return (React Error #310)
  const latePaged = usePagedList(groups.late);
  const nextPaged = usePagedList(groups.next);
  const oldPaged = usePagedList(groups.oldMisses);
  const donePaged = usePagedList(groups.done);

  if (!studentId) {
    return (
      <Layout title="Homework">
        <Card><CardContent className="py-12 text-center"><p className="text-hec-ink-soft">Please select a student profile</p></CardContent></Card>
      </Layout>
    );
  }

  return (
    <Layout title="Homework">
      <HomeworkView
        studentId={studentId}
        assignments={assignments}
        isLoading={isLoading}
        isError={isError}
        isFetching={isFetching}
        refetch={() => refetch()}
        groups={groups}
        todoCount={todoCount}
        latePaged={latePaged}
        nextPaged={nextPaged}
        oldPaged={oldPaged}
        donePaged={donePaged}
        showOldMisses={showOldMisses}
        onToggleOldMisses={() => setShowOldMisses((v) => !v)}
        selectedHomework={selectedHomework}
        onSelectHomework={setSelectedHomework}
      />
    </Layout>
  );
}
