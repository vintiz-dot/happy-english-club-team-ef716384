import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import GlobalCalendar from "@/components/schedule/GlobalCalendar";

interface TeacherProfileScheduleProps {
  teacherId: string;
  selectedMonth: string;
}

/**
 * One teacher's schedule, for an admin looking at their profile.
 *
 * Was a month grid beside a "click a day to list its sessions" panel. The
 * shared calendar has day and list views of its own, so the panel is gone and
 * the calendar is the whole screen - it also brings week view, per-class
 * colours and the duration-mismatch flag, none of which the old grid had.
 *
 * selectedMonth is no longer used: the calendar keeps its own cursor and
 * fetches the dates on screen. Kept in the props so the profile page's month
 * picker, which drives the other tabs, does not need changing.
 */
export function TeacherProfileSchedule({ teacherId }: TeacherProfileScheduleProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule</CardTitle>
        <CardDescription>
          Every session assigned to this teacher. Switch views in the header.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* role="admin" because the viewer is an admin; teacherId is what
            narrows it to this profile. */}
        <GlobalCalendar role="admin" teacherId={teacherId} />
      </CardContent>
    </Card>
  );
}
