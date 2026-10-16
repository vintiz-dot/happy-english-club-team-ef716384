import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { dayjs } from "@/lib/date";
import ClassSelector from "@/components/schedule/ClassSelector";
import { sessionPayVnd, type StaffPayRate } from "@/lib/payRate";
import { durationMinutes } from "@/lib/sessionDuration";

const TIMEZONE = "Asia/Bangkok";

interface Session {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  classes: { name: string };
}

interface TeacherPayrollCalendarProps {
  sessions: Session[];
  /** The whole pay rate, not a bare number: a per-session teacher's daily
      figure is a flat fee and does not scale with the hours shown. */
  payRate: StaffPayRate;
  month: Date;
  onMonthChange: (date: Date) => void;
}

export default function TeacherPayrollCalendar({
  sessions,
  payRate,
  month,
}: TeacherPayrollCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showClassSelector, setShowClassSelector] = useState(false);

  const now = toZonedTime(new Date(), TIMEZONE);

  const days = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  });

  const calculateSessionAmount = (session: Session) =>
    sessionPayVnd(payRate, durationMinutes(session.start_time, session.end_time) ?? 0);

  const getSessionsForDate = (date: Date) => {
    return sessions.filter((s) =>
      isSameDay(new Date(s.date), date)
    );
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
          <CardTitle>Calendar View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
            
            {Array.from({ length: startOfMonth(month).getDay() }).map((_, idx) => (
              <div key={`pad-${idx}`} className="min-h-[80px]" />
            ))}
            
            {days.map((day, index) => {
              const dateSessions = getSessionsForDate(day);
              const heldSessions = dateSessions.filter(s => getSessionStatus(s) === "Held");
              const totalEarned = heldSessions.reduce((sum, s) => sum + calculateSessionAmount(s), 0);
              
              return (
                <button
                  key={index}
                  onClick={() => dateSessions.length > 0 && handleDateClick(day)}
                  className={`
                    min-h-[80px] p-2 border rounded-lg text-left transition-all
                    ${!isSameMonth(day, month) ? "opacity-30" : ""}
                    ${isToday(day) ? "border-primary border-2" : ""}
                    ${dateSessions.length > 0 ? "hover:shadow-md cursor-pointer bg-muted/50" : ""}
                  `}
                  disabled={dateSessions.length === 0}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday(day) ? "text-primary" : ""}`}>
                    {format(day, "d")}
                  </div>
                  
                  {dateSessions.length > 0 && (
                    <div className="space-y-1">
                      {dateSessions.slice(0, 2).map((session) => {
                        const displayStatus = getSessionStatus(session);
                        return (
                          <div
                            key={session.id}
                            className="text-xs p-1 rounded bg-background border"
                          >
                            <div className="font-medium truncate">{session.classes.name}</div>
                            <div className="text-muted-foreground">
                              {session.start_time.slice(0, 5)}
                            </div>
                            <Badge
                              variant={displayStatus === "Held" ? "default" : "secondary"}
                              className="text-[10px] px-1 py-0 mt-1"
                            >
                              {displayStatus}
                            </Badge>
                          </div>
                        );
                      })}
                      {dateSessions.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dateSessions.length - 2} more
                        </div>
                      )}
                      {totalEarned > 0 && (
                        <div className="text-xs font-semibold text-success mt-1">
                          {totalEarned.toLocaleString()} ₫
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
