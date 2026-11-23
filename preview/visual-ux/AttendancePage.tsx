// The hub's attendance register (AttendanceMarking) on made-up data, inside the real shell (Phase 2 preview).
import Layout from "@/components/Layout";
import { AttendanceMarking } from "@/components/teacher/AttendanceMarking";

export default function AttendancePage() {
  return (
    <Layout title="Attendance">
      <AttendanceMarking />
    </Layout>
  );
}
