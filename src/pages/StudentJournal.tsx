import { BookOpen } from "lucide-react";
import Layout from "@/components/Layout";
import { StudentJournal as StudentJournalComponent } from "@/components/student/StudentJournal";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { useAuth } from "@/hooks/useAuth";
import { Arrive, ArriveItem } from "@/components/fx/Arrive";
import { readingLine, useReadingCopy } from "@/lib/copy/studentReading";

export default function StudentJournal() {
  const { studentId } = useStudentProfile();
  const { user } = useAuth();
  const t = useReadingCopy();

  if (!studentId) {
    return (
      <Layout title="Journal">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-hec-lg border border-dashed border-hec-line-strong bg-hec-surface px-6 py-12 text-center text-hec-body text-hec-ink-soft">
          <BookOpen className="h-10 w-10" aria-hidden />
          {readingLine(t.en("jr.pick"), t.vi("jr.pick"), t.beneath)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Journal">
      <Arrive scope="student-journal" userId={user?.id}>
        <ArriveItem index={0}>
          <StudentJournalComponent studentId={studentId} />
        </ArriveItem>
      </Arrive>
    </Layout>
  );
}
