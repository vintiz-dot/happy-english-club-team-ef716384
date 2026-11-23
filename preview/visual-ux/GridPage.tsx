// The teacher's live assessment grid on made-up data (Phase 2 preview): the real grid inside the real shell.
import Layout from "@/components/Layout";
import { LiveAssessmentGrid } from "@/components/teacher/LiveAssessmentGrid";

export default function GridPage() {
  return (
    <Layout title="Live assessment">
      <LiveAssessmentGrid classId="cls-t1" sessionId="ses-t-now" />
    </Layout>
  );
}
