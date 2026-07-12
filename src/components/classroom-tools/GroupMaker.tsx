import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { dayjs } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shuffle, Users, AlertCircle } from "lucide-react";

interface SessionRow {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  class_id: string;
  class_name: string;
}

interface AttendanceRow {
  student_id: string;
  status: string;
  full_name: string;
}

const PALETTE = [
  "from-blue-500 to-sky-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-500",
  "from-sky-500 to-cyan-500",
  "from-rose-500 to-sky-500",
  "from-indigo-500 to-blue-500",
  "from-lime-500 to-green-500",
  "from-yellow-500 to-amber-500",
];

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function partition<T>(items: T[], groupCount: number): T[][] {
  const groups: T[][] = Array.from({ length: groupCount }, () => []);
  items.forEach((item, i) => groups[i % groupCount].push(item));
  return groups;
}

export function GroupMaker() {
  const { user } = useAuth();
  const today = dayjs().format("YYYY-MM-DD");

  // Window of sessions to pick from: 7 days back through 7 days forward.
  // Wide enough to cover "what we did yesterday" and "next class" without
  // overwhelming the picker.
  const windowStart = dayjs().subtract(7, "day").format("YYYY-MM-DD");
  const windowEnd = dayjs().add(7, "day").format("YYYY-MM-DD");

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<SessionRow[]>({
    queryKey: ["classroom-tools-sessions", user?.id, windowStart, windowEnd],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user) return [];

      // Resolve the staff identity once — teacher first, fall back to TA.
      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      let raw: any[] = [];

      if (teacher) {
        const { data } = await supabase
          .from("sessions")
          .select(`id, date, start_time, end_time, class_id, classes!inner(name)`)
          .eq("teacher_id", teacher.id)
          .gte("date", windowStart)
          .lte("date", windowEnd)
          .order("date", { ascending: false })
          .order("start_time", { ascending: false });
        raw = data || [];
      } else {
        const { data: ta } = await supabase
          .from("teaching_assistants")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!ta) return [];
        const { data } = await supabase
          .from("session_participants")
          .select(`sessions!inner(id, date, start_time, end_time, class_id, classes!inner(name))`)
          .eq("teaching_assistant_id", ta.id)
          .eq("participant_type", "teaching_assistant")
          .gte("sessions.date", windowStart)
          .lte("sessions.date", windowEnd);
        raw = (data || []).map((sp: any) => sp.sessions);
      }

      return raw.map((s: any) => ({
        id: s.id,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        class_id: s.class_id,
        class_name: s.classes?.name ?? "Class",
      }));
    },
  });

  // Default selection: today's earliest session, or the closest to "now".
  const [sessionId, setSessionId] = useState<string>("");
  useEffect(() => {
    if (sessions.length === 0 || sessionId) return;
    const todays = sessions.filter((s) => s.date === today);
    setSessionId((todays[0] ?? sessions[0]).id);
  }, [sessions, sessionId, today]);

  const [groupCount, setGroupCount] = useState(3);
  const [groups, setGroups] = useState<AttendanceRow[][] | null>(null);

  const { data: present = [], isLoading: attendanceLoading } = useQuery<AttendanceRow[]>({
    queryKey: ["classroom-tools-present", sessionId],
    enabled: !!sessionId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select(`student_id, status, students!inner(full_name)`)
        .eq("session_id", sessionId)
        .eq("status", "Present");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        student_id: r.student_id,
        status: r.status,
        full_name: r.students?.full_name ?? "Unknown",
      }));
    },
  });

  const sessionLabel = useMemo(() => {
    const s = sessions.find((x) => x.id === sessionId);
    if (!s) return "";
    const when = dayjs(`${s.date}T${s.start_time}`).format("ddd D MMM, HH:mm");
    return `${s.class_name} — ${when}`;
  }, [sessions, sessionId]);

  const make = () => {
    if (present.length < groupCount) {
      setGroups(null);
      return;
    }
    const shuffled = shuffle(present);
    setGroups(partition(shuffled, groupCount));
  };

  // Reset groups when the source data changes underneath us.
  useEffect(() => {
    setGroups(null);
  }, [sessionId, groupCount]);

  const tooFew = present.length < groupCount;
  const noAttendance = !attendanceLoading && sessionId && present.length === 0;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="gm-session" className="type-micro">Session</Label>
        <Select
          value={sessionId}
          onValueChange={setSessionId}
          disabled={sessionsLoading || sessions.length === 0}
        >
          <SelectTrigger id="gm-session">
            <SelectValue placeholder={sessionsLoading ? "Loading…" : "Pick a session"} />
          </SelectTrigger>
          <SelectContent>
            {sessions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {dayjs(s.date).format("ddd D MMM")} • {s.start_time.slice(0, 5)} • {s.class_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sessionLabel && (
          <p className="type-micro text-muted-foreground">{sessionLabel}</p>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
        <div className="space-y-2">
          <Label htmlFor="gm-count" className="type-micro">Number of groups</Label>
          <Input
            id="gm-count"
            type="number"
            inputMode="numeric"
            min={2}
            max={10}
            value={groupCount}
            onChange={(e) =>
              setGroupCount(Math.max(2, Math.min(10, Number(e.target.value) || 2)))
            }
          />
        </div>
        <Button
          onClick={make}
          size="lg"
          className="h-10 gap-2"
          disabled={!sessionId || attendanceLoading || tooFew}
        >
          <Shuffle className="h-4 w-4" />
          Make
        </Button>
      </div>

      <div className="rounded-xl border bg-muted/30 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="type-micro">
            {attendanceLoading
              ? "Counting present students…"
              : `${present.length} present`}
          </span>
        </div>
        {present.length > 0 && (
          <Badge variant="secondary" className="font-normal">
            ~{Math.ceil(present.length / groupCount)} per group
          </Badge>
        )}
      </div>

      {noAttendance && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="type-micro text-amber-800 dark:text-amber-200 space-y-0.5">
            <p className="font-semibold">No present students recorded.</p>
            <p>Mark attendance for this session, then come back here.</p>
          </div>
        </div>
      )}

      {tooFew && present.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="type-micro text-amber-800 dark:text-amber-200">
            Only {present.length} student{present.length === 1 ? " is" : "s are"} present —
            need at least {groupCount} for {groupCount} groups. Lower the group count or mark
            more students present.
          </p>
        </div>
      )}

      {groups && (
        <div className="space-y-3">
          {groups.map((g, i) => (
            <div key={i} className="rounded-xl surface-2 ring-1 ring-border shadow-q1 overflow-hidden">
              <div
                className={`bg-gradient-to-r ${PALETTE[i % PALETTE.length]} text-white px-4 py-2 flex items-center justify-between`}
              >
                <span className="type-h2 font-extrabold">Group {i + 1}</span>
                <Badge className="bg-white/20 text-white border-white/30">
                  {g.length} {g.length === 1 ? "member" : "members"}
                </Badge>
              </div>
              <ul className="p-3 space-y-1">
                {g.map((m) => (
                  <li key={m.student_id} className="type-body">
                    {m.full_name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
