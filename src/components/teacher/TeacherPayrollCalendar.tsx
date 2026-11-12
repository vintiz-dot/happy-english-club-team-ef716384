import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import ClassSelector from "@/components/schedule/ClassSelector";
import type { TeacherPayrollSession } from "@/lib/teacherPayrollView";

const TIMEZONE = "Asia/Bangkok";

/** The shape ClassSelector reads. */
interface Session {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  classes: { name: string };
}

interface TeacherPayrollCalendarProps {
  /** calculate-payroll's lessons, mapped by teacherPayrollView. */
  sessions: TeacherPayrollSession[];
  /**
   * YYYY-MM-DD -> what that day's paid lessons come to, as calculate-payroll
   * priced them (teacherPayrollView). Null = figure unavailable. Nothing on
   * this calendar prices a lesson: it used to, at today's rate, and so
   * disagreed with the function after any change of rate.
   */
  earnedByDate: Map<string, number | null>;
  month: Date;
  onMonthChange: (date: Date) => void;
}

const toSelectorSession = (s: TeacherPayrollSession): Session => ({
  id: s.id,
  date: s.date,
  start_time: s.startTime,
  end_time: s.endTime,
  status: s.status,
  classes: { name: s.className },
});

export default function TeacherPayrollCalendar({
  sessions: payrollSessions,
  earnedByDate,
  month,
}: TeacherPayrollCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showClassSelector, setShowClassSelector] = useState(false);

  const sessions = payrollSessions.map(toSelectorSession);

  const days = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  });

  // Session dates are calendar dates (YYYY-MM-DD); compared as text so no
  // timezone can move a lesson onto the next or previous day.
  const getSessionsForDate = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    return sessions.filter((s) => s.date === key);
  };

  const getSessionStatus = (session: Session) => {
    const sessionDateTime = new Date(`${session.date}T${session.start_time}`);
    const nowBangkok = toZonedTime(new Date(), TIMEZONE);
    
    if (sessionDateTime > nowBangkok) {
      return "Scheduled";
    }
    
    return session.status;
  };

  const handleDateClick = (date: Date) => {
    const dateSessions = getSessionsForDate(date);
    if (dateSessions.length > 1) {
      setSelectedDate(date);
      setShowClassSelector(true);
    } else if (dateSessions.length === 1) {
      window.location.href = `/schedule?date=${format(date, "yyyy-MM-dd")}`;
    }
  };

  const handleSelectSession = (session: Session) => {
    window.location.href = `/schedule?date=${session.date}`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-hec-h2">Calendar View</CardTitle>
        </CardHeader>
        <CardContent className="px-1 sm:px-6">
          <div className="grid grid-cols-7 gap-0.5 sm:gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="py-2 text-center text-hec-caption font-medium text-hec-ink-soft">
                {day}
              </div>
            ))}
            
            {Array.from({ length: startOfMonth(month).getDay() }).map((_, idx) => (
              <div key={`pad-${idx}`} className="min-h-[80px]" />
            ))}
            
            {days.map((day, index) => {
              const dateSessions = getSessionsForDate(day);
              const dayKey = format(day, "yyyy-MM-dd");
              // undefined: no paid lesson that day. null: there is one but
              // its figure is unavailable (see teacherPayrollView).
              const totalEarned = earnedByDate.get(dayKey);

              return (
                <button
                  key={index}
                  onClick={() => dateSessions.length > 0 && handleDateClick(day)}
                  className={`
                    flex flex-col justify-start min-h-[80px] min-w-0 p-1 sm:p-2 border border-hec-line rounded-hec-md text-left text-hec-ink transition-shadow duration-hec-1 ease-hec focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring
                    ${!isSameMonth(day, month) ? "opacity-30" : ""}
                    ${isToday(day) ? "border-hec-brass" : ""}
                    ${dateSessions.length > 0 ? "hover:shadow-hec-2 cursor-pointer bg-hec-sunken" : ""}
                  `}
                  disabled={dateSessions.length === 0}
                >
                  <div className={`mb-1 text-hec-small font-medium tabular-nums ${isToday(day) ? "text-hec-brass" : ""}`}>
                    {format(day, "d")}
                  </div>
                  
                  {dateSessions.length > 0 && (
                    <div className="space-y-1">
                      {dateSessions.slice(0, 2).map((session) => {
                        const displayStatus = getSessionStatus(session);
                        return (
                          <div
                            key={session.id}
                            className="rounded-hec-sm border border-hec-line bg-hec-surface p-1 text-hec-caption"
                          >
                            <div className="whitespace-normal break-words hyphens-none font-medium">{session.classes.name}</div>
                            <div className="tabular-nums text-hec-ink-soft">
                              {session.start_time.slice(0, 5)}
                            </div>
                            <Badge
                              variant={displayStatus === "Held" ? "default" : "secondary"}
                              className="mt-1 px-1 py-0"
                            >
                              {displayStatus}
                            </Badge>
                          </div>
                        );
                      })}
                      {dateSessions.length > 2 && (
                        <div className="text-hec-caption text-hec-ink-soft">
                          +{dateSessions.length - 2} more
                        </div>
                      )}
                      {typeof totalEarned === "number" && totalEarned > 0 && (
                        <div className="mt-1 text-hec-caption font-semibold tabular-nums text-hec-ink">
                          {totalEarned.toLocaleString()} ₫
                        </div>
                      )}
                      {totalEarned === null && (
                        <div className="mt-1 text-hec-caption text-hec-ink-soft" title="Figure unavailable">
                          <span aria-hidden="true">—</span>
                          <span className="sr-only">Figure unavailable</span>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {showClassSelector && selectedDate && (
        <ClassSelector
          date={selectedDate}
          sessions={getSessionsForDate(selectedDate)}
          onSelectSession={handleSelectSession}
          onClose={() => {
            setShowClassSelector(false);
            setSelectedDate(null);
          }}
        />
      )}
    </>
  );
}
