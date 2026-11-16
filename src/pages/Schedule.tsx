import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useIvory } from "@/hooks/useIvory";
import { SessionGenerator } from "@/components/admin/SessionGenerator";
import GlobalCalendar from "@/components/schedule/GlobalCalendar";
import AddSessionModal from "@/components/admin/AddSessionModal";

const Schedule = () => {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  // Staff on /schedule are in the system (R21); a student's or a parent's
  // /schedule is not yet (parent area, R23), so it keeps today's classes.
  const ivory = useIvory();
  const [addSessionDate, setAddSessionDate] = useState<Date | null>(null);
  const [editSession, setEditSession] = useState<any>(null);

  const handleAddSession = (date: Date) => {
    setAddSessionDate(date);
  };

  const handleEditSession = (session: any) => {
    setEditSession(session);
  };

  return (
    <Layout>
      <div className={ivory ? "space-y-6" : "space-y-8"}>
        <div>
          <h1 className={ivory ? "font-display text-hec-h1 font-medium text-hec-ink" : "text-3xl font-bold tracking-tight"}>
            {role === "student" ? "My Classes" : role === "teacher" ? "My Schedule" : "Schedule"}
          </h1>
          <p className={ivory ? "text-hec-small text-hec-ink-soft" : "text-muted-foreground"}>
            {role === "student" 
              ? "View your class schedule and attendance" 
              : role === "teacher" 
              ? "View your teaching schedule and mark attendance" 
              : "View and manage class schedules"}
          </p>
        </div>

        {role === "admin" && (
          <SessionGenerator onSuccess={() => queryClient.invalidateQueries({ queryKey: ["calendar-sessions"] })} />
        )}

        <GlobalCalendar
          role={role as "admin" | "teacher" | "student"}
          onAddSession={role === "admin" ? handleAddSession : undefined}
          onEditSession={role === "admin" ? handleEditSession : undefined}
        />
      </div>

      {addSessionDate && role === "admin" && (
        <AddSessionModal
          classId=""
          date={addSessionDate}
          open={!!addSessionDate}
          onClose={() => setAddSessionDate(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["calendar-sessions"] });
            setAddSessionDate(null);
          }}
        />
      )}
    </Layout>
  );
};

export default Schedule;
