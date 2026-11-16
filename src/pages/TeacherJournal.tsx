import Layout from "@/components/Layout";
import { TeacherJournalViewEnhanced } from "@/components/teacher/TeacherJournalViewEnhanced";

export default function TeacherJournal() {
  return (
    <Layout title="Student Journals">
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-hec-h1 font-medium text-hec-ink">Student Journals</h1>
          <p className="text-hec-small text-hec-ink-soft">View and manage student journal entries</p>
        </div>
        <TeacherJournalViewEnhanced />
      </div>
    </Layout>
  );
}
