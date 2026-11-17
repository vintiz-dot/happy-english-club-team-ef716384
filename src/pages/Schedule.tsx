import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { SessionGenerator } from "@/components/admin/SessionGenerator";
import GlobalCalendar from "@/components/schedule/GlobalCalendar";
import AddSessionModal from "@/components/admin/AddSessionModal";

const Schedule = () => {
  const queryClient = useQueryClient();
  const { role } = useAuth();
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
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-hec-h1 font-medium text-hec-ink">
            {role === "student" ? "My Classes" : role === "teacher" ? "My Schedule" : "Schedule"}
          </h1>
          <p className="text-hec-small text-hec-ink-soft">
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
