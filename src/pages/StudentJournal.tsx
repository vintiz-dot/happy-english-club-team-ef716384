import Layout from "@/components/Layout";
import { StudentJournal as StudentJournalComponent } from "@/components/student/StudentJournal";
import { useStudentProfile } from "@/contexts/StudentProfileContext";

export default function StudentJournal() {
  const { studentId } = useStudentProfile();

  if (!studentId) {
    return (
      <Layout title="Journal">
        <p className="text-center text-hec-body text-hec-ink-soft">Please select a student profile.</p>
      </Layout>
    );
  }

  return (
    <Layout title="Journal">
      <StudentJournalComponent studentId={studentId} />
    </Layout>
  );
}
