import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import GlobalCalendar from "@/components/schedule/GlobalCalendar";
import SessionDetailDrawer from "./SessionDetailDrawer";
import AddSessionModal from "@/components/admin/AddSessionModal";

interface ClassCalendarProps {
  classId: string;
}

/**
 * The class calendar.
 *
 * Was a month grid with its own prev/next/Today buttons and its own
 * month-at-a-time query. It now uses the shared calendar, which brings month,
 * week, day and list views, per-class colours, the duration-mismatch flag and
 * drag-to-reschedule, and which fetches the dates actually on screen rather
 * than always a calendar month. Its own navigation went with it - the
 * calendar carries that in its header - and so did the local event mapping,
 * which had no class_id and so could not colour or flag anything.
 *
 * The session drawer stays local: this screen opens the full editable detail
 * drawer, not the attendance one the calendar defaults to.
 */
const ClassCalendar = ({ classId }: ClassCalendarProps) => {
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<any>(null);

  // The calendar owns its own query now, so editing a session has to tell it
  // to refetch - the old local refetch() went with the local query.
  const refreshCalendar = () =>
    queryClient.invalidateQueries({ queryKey: ["calendar-sessions"] });
  const [addSessionDate, setAddSessionDate] = useState<Date | null>(null);

  const { data: classData } = useQuery({
    queryKey: ["class", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("name")
        .eq("id", classId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>{classData?.name || "Class"} Calendar</CardTitle>
          <Button onClick={() => setAddSessionDate(new Date())} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Session
          </Button>
        </CardHeader>
        <CardContent>
          <GlobalCalendar
            role="admin"
            classId={classId}
            onAddSession={(date) => setAddSessionDate(date)}
            // SessionDetailDrawer expects the teacher under `teacher`.
            onSelectSession={(session) =>
              setSelectedSession({ ...session, teacher: session.teachers })
            }
          />
        </CardContent>
      </Card>

      {selectedSession && (
        <SessionDetailDrawer
          session={selectedSession}
          onClose={() => {
            setSelectedSession(null);
            refreshCalendar();
          }}
        />
      )}

      {addSessionDate && (
        <AddSessionModal
          classId={classId}
          date={addSessionDate}
          open={!!addSessionDate}
          onClose={() => setAddSessionDate(null)}
          onSuccess={() => {
            setAddSessionDate(null);
            refreshCalendar();
          }}
        />
      )}
    </div>
  );
};

export default ClassCalendar;
