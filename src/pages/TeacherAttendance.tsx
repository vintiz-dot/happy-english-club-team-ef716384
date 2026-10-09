import Layout from "@/components/Layout";
import GlobalCalendar from "@/components/schedule/GlobalCalendar";

/**
 * Attendance, from the teacher's own schedule.
 *
 * Was a month grid with its own prev/next buttons, its own teacher-or-TA
 * resolution and its own attendance drawer. The shared calendar does all
 * three - it opens the attendance drawer itself for any non-student role -
 * so this page is now just the calendar, and gains week, day and list views,
 * per-class colours and the duration-mismatch flag.
 *
 * The old page also refused to page past the current month. The calendar
 * does not, which is the better behaviour here: attendance is sometimes
 * entered late, and a teacher could not reach a session that had slipped
 * into the next month.
 */
export default function TeacherAttendance() {
  return (
    <Layout title="Attendance">
      <GlobalCalendar role="teacher" />
    </Layout>
  );
}
