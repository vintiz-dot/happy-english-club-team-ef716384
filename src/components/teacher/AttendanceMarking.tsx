import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, isPast, addHours } from "date-fns";
import { Clock, Users, Award } from "lucide-react";
import { ParticipationPoints } from "@/components/admin/ParticipationPoints";
import { useAuth } from "@/hooks/useAuth";

interface Session {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  classes: {
    name: string;
  };
}

interface Student {
  id: string;
  full_name: string;
}

interface AttendanceRecord {
  student_id: string;
  status: 'Present' | 'Absent' | 'Excused';
}

export function AttendanceMarking() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'Present' | 'Absent' | 'Excused'>>({});
  const [loading, setLoading] = useState(false);
  const [showParticipationPoints, setShowParticipationPoints] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) loadTodaySessions();
  }, [user]);

  const loadTodaySessions = async () => {
    try {
      const userId = user?.id;
      if (!userId) return;

      // Try teacher first
      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      const today = format(new Date(), "yyyy-MM-dd");

      if (teacher) {
        const { data, error } = await supabase
          .from("sessions")
          .select("*, classes(name)")
          .eq("teacher_id", teacher.id)
          .eq("date", today)
          .order("start_time");

        if (error) throw error;
        setSessions(data || []);
      } else {
        // Try TA
        const { data: ta } = await supabase
          .from("teaching_assistants")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!ta) return;

        const { data: spData, error } = await supabase
          .from("session_participants")
          .select("sessions!inner(*, classes(name))")
          .eq("teaching_assistant_id", ta.id)
          .eq("participant_type", "teaching_assistant")
          .eq("sessions.date", today);

        if (error) throw error;
        setSessions((spData || []).map((sp: any) => sp.sessions));
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadStudentsAndAttendance = async (sessionId: string) => {
    try {
      setLoading(true);
      
      // Get enrolled students for this class
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      const { data: sessionData } = await supabase
        .from("sessions")
        .select("class_id, date")
        .eq("id", sessionId)
        .single();

      const { data: enrollments } = await supabase
        .from("enrollments" as any)
        .select("student_id, start_date, end_date, students(id, full_name)")
        .eq("class_id", sessionData?.class_id)
        .lte("start_date", sessionData.date)
        .or(`end_date.is.null,end_date.gte.${sessionData.date}`);

      // Filter to only students actually enrolled on session date
      const validEnrollments = (enrollments || []).filter((e: any) => 
        e.start_date <= sessionData.date && (!e.end_date || e.end_date >= sessionData.date)
      );
      
      // Deduplicate by student id
      const seen = new Set<string>();
      const studentsList: Student[] = [];
      for (const e of validEnrollments) {
        const s = (e as any).students;
        if (s && !seen.has(s.id)) {
          seen.add(s.id);
          studentsList.push(s);
        }
      }
      setStudents(studentsList);

      // Load existing attendance
      const { data: existingAttendance } = await supabase
        .from("attendance" as any)
        .select("*")
        .eq("session_id", sessionId);

      const attendanceMap: Record<string, 'Present' | 'Absent' | 'Excused'> = {};
      existingAttendance?.forEach((record: any) => {
        attendanceMap[record.student_id] = record.status;
      });

      // Default to Present for students without records
      studentsList.forEach(student => {
        if (!attendanceMap[student.id]) {
          attendanceMap[student.id] = 'Present';
        }
      });

      setAttendance(attendanceMap);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSessionSelect = async (session: Session) => {
    setSelectedSession(session);
    await loadStudentsAndAttendance(session.id);
  };

  const toggleAttendance = (studentId: string) => {
    const statuses: Array<'Present' | 'Absent' | 'Excused'> = ['Present', 'Absent', 'Excused'];
    const currentIndex = statuses.indexOf(attendance[studentId]);
    const nextIndex = (currentIndex + 1) % statuses.length;
    
    setAttendance(prev => ({
      ...prev,
      [studentId]: statuses[nextIndex]
    }));
  };

  const saveAttendance = async () => {
    if (!selectedSession) return;

    try {
      setLoading(true);

      const records = Object.entries(attendance).map(([student_id, status]) => ({
        session_id: selectedSession.id,
        student_id,
        status,
        marked_by: user?.id,
      }));

      // Upsert attendance records
      const { error } = await supabase
        .from("attendance" as any)
        .upsert(records, { 
          onConflict: 'session_id,student_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      // Update session status to Held only if at least 5 minutes past end time
      const sessionEnd = new Date(`${selectedSession.date}T${selectedSession.end_time}`);
      const fiveMinutesAfterEnd = new Date(sessionEnd.getTime() + 5 * 60000);
      const now = new Date();
      
      // Only mark as Held if at least 5 minutes past end (prevents invalid future "Held")
      if (now >= fiveMinutesAfterEnd && selectedSession.status === 'Scheduled') {
        await supabase
          .from("sessions")
          .update({ status: 'Held' })
          .eq("id", selectedSession.id);
      }

      toast({
        title: "Success",
        description: "Attendance saved successfully",
      });

      setSelectedSession(null);
      loadTodaySessions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canMarkAttendance = (session: Session) => {
    // Must wait until 5 minutes AFTER session end time per build spec
    const sessionEndTime = new Date(`${session.date}T${session.end_time}`);
    const fiveMinutesAfterEnd = new Date(sessionEndTime.getTime() + 5 * 60000);
    const now = new Date();
    
    // Can't mark until 5 minutes after session ends
    if (now < fiveMinutesAfterEnd) return false;
    
    // Can mark within 24 hours after session ends
    const twentyFourHoursLater = addHours(sessionEndTime, 24);
    return now <= twentyFourHoursLater;
  };
  
  const isSessionMarked = (sessionId: string) => {
    // Check if attendance has been saved for this session
    return sessions.some(s => s.id === sessionId && s.status === 'Held');
  };

  const getStatusBadge = (status: 'Present' | 'Absent' | 'Excused') => {
    const colors = {
      Present: "bg-success/20 text-success hover:bg-success/30",
      Absent: "bg-destructive/20 text-destructive hover:bg-destructive/30",
      Excused: "bg-warning/20 text-warning hover:bg-warning/30"
    };
    return colors[status];
  };

  if (selectedSession) {
    const canEdit = canMarkAttendance(selectedSession);
    const alreadyMarked = isSessionMarked(selectedSession.id);

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mark Attendance</CardTitle>
              <CardDescription>
                {selectedSession.classes.name} - {format(new Date(`${selectedSession.date}T${selectedSession.start_time}`), "h:mm a")}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => setSelectedSession(null)}>
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canEdit && (
            <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
              {new Date() < new Date(new Date(`${selectedSession.date}T${selectedSession.end_time}`).getTime() + 5 * 60000)
                ? "⚠️ Cannot mark attendance yet. Please wait until 5 minutes after the session ends (prevents invalid 'Held' status)."
                : "Editing window closed (24 hours after session end)"}
            </div>
          )}
          
          {alreadyMarked && canEdit && (
            <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-lg text-sm">
              Attendance has been marked. You can still make changes within the 24-hour window.
            </div>
          )}
          
          {students.map(student => (
            <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
              <span className="font-medium">{student.full_name}</span>
              <Badge
                className={`cursor-pointer ${getStatusBadge(attendance[student.id])}`}
                onClick={() => canEdit && toggleAttendance(student.id)}
              >
                {attendance[student.id]}
              </Badge>
            </div>
          ))}

          {canEdit && (
            <div className="space-y-2">
              <Button 
                onClick={saveAttendance} 
                disabled={loading || alreadyMarked} 
                className="w-full"
                variant={alreadyMarked ? "secondary" : "default"}
              >
                {alreadyMarked ? "Attendance Marked ✓" : "Save Attendance"}
              </Button>
              <Button
                onClick={() => setShowParticipationPoints(true)}
                variant="outline"
                className="w-full"
              >
                <Award className="h-4 w-4 mr-2" />
                Add Points
              </Button>
            </div>
          )}
        </CardContent>
        
        {showParticipationPoints && selectedSession && (
          <ParticipationPoints
            session={selectedSession}
            students={students}
            onClose={() => setShowParticipationPoints(false)}
          />
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Today's Sessions
        </CardTitle>
        <CardDescription>Select a session to mark attendance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No sessions scheduled for today</p>
        ) : (
          sessions.map(session => (
            <div
              key={session.id}
              className="p-4 border rounded-lg hover:border-primary cursor-pointer transition-colors"
              onClick={() => handleSessionSelect(session)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{session.classes.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(`${session.date}T${session.start_time}`), "h:mm a")} - 
                    {format(new Date(`${session.date}T${session.end_time}`), "h:mm a")}
                  </p>
                </div>
                <Badge variant={session.status === 'Held' ? 'default' : 'secondary'}>
                  {session.status}
                </Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
