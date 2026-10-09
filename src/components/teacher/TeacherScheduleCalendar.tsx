import { Card } from "@/components/ui/card";
import GlobalCalendar from "@/components/schedule/GlobalCalendar";

/**
 * The teacher's own schedule.
 *
 * Was a month grid with hand-rolled prev/next buttons and a month-at-a-time
 * query that resolved teacher-or-TA itself. The shared calendar does all of
 * that - including the TA branch - and adds week, day and list views,
 * per-class colours and the duration-mismatch flag.
 */
export default function TeacherScheduleCalendar() {
  return (
    <Card className="p-4">
      <GlobalCalendar role="teacher" />
    </Card>
  );
}
